import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { env, REFRESH_REUSE_GRACE_MS } from '../config/env';
import { hashSecret, newSecretToken } from '../common/tokens';
import { PrismaService } from '../prisma/prisma.service';

export class RefreshRejectedException extends UnauthorizedException {
  constructor(readonly clearCookie: boolean) {
    super('Сессия недействительна');
  }
}

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string): Promise<string> {
    const raw = newSecretToken();
    const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: { userId, expiresAt: { lt: new Date() } },
      }),
      this.prisma.refreshToken.create({
        data: { userId, tokenHash: hashSecret(raw), expiresAt },
      }),
    ]);
    return raw;
  }

  async rotate(rawToken: string): Promise<{ raw: string; userId: string }> {
    const tokenHash = hashSecret(rawToken);
    const outcome = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; user_id: string; expires_at: Date; revoked_at: Date | null }>>(
        Prisma.sql`SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ${tokenHash} FOR UPDATE`,
      );
      const existing = rows[0];
      if (!existing) {
        return { ok: false as const, clearCookie: true };
      }
      if (existing.revoked_at) {
        const age = Date.now() - new Date(existing.revoked_at).getTime();
        if (age > REFRESH_REUSE_GRACE_MS) {
          await tx.refreshToken.updateMany({
            where: { userId: existing.user_id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        return { ok: false as const, clearCookie: age > REFRESH_REUSE_GRACE_MS };
      }
      if (new Date(existing.expires_at).getTime() <= Date.now()) {
        return { ok: false as const, clearCookie: true };
      }

      const raw = newSecretToken();
      const nextHash = hashSecret(raw);
      const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedByTokenHash: nextHash },
      });
      await tx.refreshToken.create({
        data: { userId: existing.user_id, tokenHash: nextHash, expiresAt },
      });
      return { ok: true as const, raw, userId: existing.user_id };
    });

    if (!outcome.ok) {
      throw new RefreshRejectedException(outcome.clearCookie);
    }
    return { raw: outcome.raw, userId: outcome.userId };
  }

  async revoke(rawToken: string | undefined) {
    if (!rawToken) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashSecret(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
