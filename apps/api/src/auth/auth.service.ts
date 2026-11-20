import { BadRequestException, ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { env } from '../config/env';
import type { AuthUser } from '../common/auth-user';
import { UsersService } from '../users/users.service';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { RefreshRejectedException, RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash = '';

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async onModuleInit() {
    this.dummyHash = await bcrypt.hash(randomBytes(16).toString('hex'), env.bcryptRounds);
  }

  async register(input: RegisterInput) {
    this.assertPasswordBytes(input.password);
    const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
    try {
      const user = await this.users.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
      return this.createSession(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Учётная запись с таким email уже существует');
      }
      throw error;
    }
  }

  async login(input: LoginInput) {
    this.assertPasswordBytes(input.password);
    const user = await this.users.findAuthByEmail(input.email);
    const hash = user?.passwordHash ?? this.dummyHash;
    const matches = await bcrypt.compare(input.password, hash);
    if (!user || !matches) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return this.createSession(publicUser);
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) {
      throw new RefreshRejectedException(true);
    }
    const rotated = await this.refreshTokens.rotate(rawToken);
    const user = await this.users.findById(rotated.userId);
    if (!user) {
      throw new RefreshRejectedException(true);
    }
    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: rotated.raw,
      user,
    };
  }

  async logout(rawToken: string | undefined) {
    await this.refreshTokens.revoke(rawToken);
  }

  private async createSession(user: AuthUser) {
    const refreshToken = await this.refreshTokens.issue(user.id);
    return {
      accessToken: await this.signAccessToken(user),
      refreshToken,
      user,
    };
  }

  private signAccessToken(user: AuthUser) {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  private assertPasswordBytes(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Пароль слишком длинный');
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
}
