import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { env, FAMILY_MEMBER_LIMIT, FAMILY_TARGET } from '../config/env';
import type { AuthUser } from '../common/auth-user';
import { hashSecret, newSecretToken } from '../common/tokens';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFamilyInput } from './family.schemas';

const INVALID_INVITE = 'Приглашение недействительно или срок его действия истёк';

export type FamilySummary = {
  id: string;
  name: string;
  targetCount: number;
  timezone: string;
  memberCount: number;
  createdAt: Date;
};

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, input: CreateFamilyInput): Promise<FamilySummary> {
    if (user.familyId) {
      throw new ConflictException('Вы уже состоите в семейной группе');
    }

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { familyId: true } });
      if (fresh?.familyId) {
        throw new ConflictException('Вы уже состоите в семейной группе');
      }
      const family = await tx.family.create({
        data: {
          name: input.name,
          timezone: input.timezone,
          targetCount: FAMILY_TARGET,
        },
      });
      await tx.user.update({ where: { id: user.id }, data: { familyId: family.id } });
      return this.toSummary(family, 1);
    });
  }

  async getForUser(user: AuthUser): Promise<FamilySummary> {
    const family = await this.requireFamily(user);
    const memberCount = await this.prisma.user.count({ where: { familyId: family.id } });
    return this.toSummary(family, memberCount);
  }

  async requireFamily(user: AuthUser) {
    if (!user.familyId) {
      throw new BadRequestException('Сначала создайте семейную группу или присоединитесь к ней');
    }
    const family = await this.prisma.family.findUnique({ where: { id: user.familyId } });
    if (!family || family.id !== user.familyId) {
      throw new NotFoundException('Семейная группа не найдена');
    }
    return family;
  }

  async createInvitation(user: AuthUser) {
    const family = await this.requireFamily(user);
    const memberCount = await this.prisma.user.count({ where: { familyId: family.id } });
    if (memberCount >= FAMILY_MEMBER_LIMIT) {
      throw new ConflictException('В семье уже два участника');
    }

    const token = newSecretToken();
    const expiresAt = new Date(Date.now() + env.inviteTtlHours * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.invitation.updateMany({
        where: { familyId: family.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.invitation.create({
        data: {
          familyId: family.id,
          tokenHash: hashSecret(token),
          expiresAt,
          createdById: user.id,
        },
      }),
    ]);

    return { token, expiresAt };
  }

  async join(user: AuthUser, token: string) {
    if (user.familyId) {
      throw new ConflictException('Вы уже состоите в семейной группе');
    }

    const tokenHash = hashSecret(token);
    const familyId = await this.prisma.$transaction(async (tx) => {
      const invitations = await tx.$queryRaw<Array<{ id: string; family_id: string; expires_at: Date; used_at: Date | null }>>(
        Prisma.sql`SELECT id, family_id, expires_at, used_at FROM invitations WHERE token_hash = ${tokenHash} FOR UPDATE`,
      );
      const invitation = invitations[0];
      if (!invitation || invitation.used_at || new Date(invitation.expires_at).getTime() <= Date.now()) {
        throw new BadRequestException(INVALID_INVITE);
      }

      await tx.$queryRaw(Prisma.sql`SELECT id FROM families WHERE id = ${invitation.family_id}::uuid FOR UPDATE`);
      const memberCount = await tx.user.count({ where: { familyId: invitation.family_id } });
      if (memberCount >= FAMILY_MEMBER_LIMIT) {
        throw new ConflictException('В семье уже два участника');
      }

      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { familyId: true } });
      if (fresh?.familyId) {
        throw new ConflictException('Вы уже состоите в семейной группе');
      }

      await tx.user.update({ where: { id: user.id }, data: { familyId: invitation.family_id } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { usedAt: new Date() } });
      return invitation.family_id;
    });

    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('Семейная группа не найдена');
    }
    const memberCount = await this.prisma.user.count({ where: { familyId: family.id } });
    return { ...this.toSummary(family, memberCount), familyId: family.id };
  }

  private toSummary(
    family: { id: string; name: string; targetCount: number; timezone: string; createdAt: Date },
    memberCount: number,
  ): FamilySummary {
    return {
      id: family.id,
      name: family.name,
      targetCount: family.targetCount,
      timezone: family.timezone,
      memberCount,
      createdAt: family.createdAt,
    };
  }
}
