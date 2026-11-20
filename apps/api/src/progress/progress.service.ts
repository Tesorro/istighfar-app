import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { HISTORY_DEFAULT_DAYS } from '../config/env';
import { FamilyService } from '../family/family.service';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, dateOnlyUtc, todayIso, toIsoDate } from './dates';
import type { HistoryQuery, ProgressWriteInput } from './progress.schemas';
import { toFamilyProgress, toHistoryDay, type HistoryDay } from './stats';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamilyService,
  ) {}

  async today(user: AuthUser) {
    const family = await this.families.requireFamily(user);
    const date = todayIso(family.timezone);
    const record = await this.prisma.dailyProgress.findUnique({
      where: { userId_date: { userId: user.id, date: dateOnlyUtc(date) } },
      select: { id: true, count: true },
    });
    return {
      date,
      timezone: family.timezone,
      isSubmitted: Boolean(record),
      count: record?.count ?? null,
      progressId: record?.id ?? null,
    };
  }

  async create(user: AuthUser, input: ProgressWriteInput) {
    const family = await this.families.requireFamily(user);
    const date = todayIso(family.timezone);
    try {
      const created = await this.prisma.dailyProgress.create({
        data: {
          userId: user.id,
          date: dateOnlyUtc(date),
          count: input.count,
        },
        select: { id: true, count: true },
      });
      return {
        date,
        timezone: family.timezone,
        isSubmitted: true,
        count: created.count,
        progressId: created.id,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Запись за этот день уже существует. Её можно изменить.');
      }
      throw error;
    }
  }

  async update(user: AuthUser, progressId: string, input: ProgressWriteInput) {
    const family = await this.families.requireFamily(user);
    const date = todayIso(family.timezone);
    const record = await this.prisma.dailyProgress.findFirst({
      where: { id: progressId, userId: user.id },
      select: { id: true, date: true },
    });
    if (!record) {
      throw new NotFoundException('Запись не найдена');
    }
    if (toIsoDate(record.date) !== date) {
      throw new BadRequestException('Изменить можно только сегодняшний результат');
    }
    const updated = await this.prisma.dailyProgress.update({
      where: { id: record.id },
      data: { count: input.count },
      select: { id: true, count: true },
    });
    return {
      date,
      timezone: family.timezone,
      isSubmitted: true,
      count: updated.count,
      progressId: updated.id,
    };
  }

  async familyProgress(user: AuthUser) {
    const family = await this.families.requireFamily(user);
    const today = dateOnlyUtc(todayIso(family.timezone));
    const [total, todayStats, totalMembers] = await Promise.all([
      this.prisma.dailyProgress.aggregate({
        where: { user: { familyId: family.id } },
        _sum: { count: true },
      }),
      this.prisma.dailyProgress.aggregate({
        where: { user: { familyId: family.id }, date: today },
        _sum: { count: true },
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { familyId: family.id } }),
    ]);

    return toFamilyProgress({
      targetCount: family.targetCount,
      totalCount: total._sum.count ?? 0,
      todayCount: todayStats._sum.count ?? 0,
      membersSubmittedToday: todayStats._count._all,
      totalMembers,
    });
  }

  async history(user: AuthUser, query: HistoryQuery): Promise<HistoryDay[]> {
    const family = await this.families.requireFamily(user);
    const today = todayIso(family.timezone);
    const from = query.from ?? addDays(today, -(HISTORY_DEFAULT_DAYS - 1));
    const to = query.to ?? today;
    if (from > to) {
      throw new BadRequestException('Начало периода позже его конца');
    }

    const [rows, totalMembers] = await Promise.all([
      this.prisma.dailyProgress.groupBy({
        by: ['date'],
        where: {
          user: { familyId: family.id },
          date: { gte: dateOnlyUtc(from), lte: dateOnlyUtc(to) },
        },
        _sum: { count: true },
        _count: { _all: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.user.count({ where: { familyId: family.id } }),
    ]);

    return rows.map((row) =>
      toHistoryDay({
        date: toIsoDate(row.date),
        totalCount: row._sum.count ?? 0,
        submittedCount: row._count._all,
        totalMembers,
      }),
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
}
