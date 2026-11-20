import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

const publicSelect = {
  id: true,
  name: true,
  email: true,
  familyId: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: publicSelect });
  }

  findAuthByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...publicSelect, passwordHash: true },
    });
  }

  create(input: { name: string; email: string; passwordHash: string }): Promise<AuthUser> {
    return this.prisma.user.create({
      data: input,
      select: publicSelect,
    });
  }
}
