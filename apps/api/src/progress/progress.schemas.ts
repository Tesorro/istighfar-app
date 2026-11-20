import { z } from 'zod';
import { DAILY_COUNT_MAX } from '../config/env';

const countMessage = 'Введите целое число от 0 до 100 000';

export const progressWriteSchema = z
  .object({
    count: z.number(countMessage).int(countMessage).min(0, countMessage).max(DAILY_COUNT_MAX, countMessage),
  })
  .strict();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return false;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, 'Несуществующая дата');

export const historyQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, 'Начало периода позже его конца');

export const progressIdSchema = z.uuid('Некорректный идентификатор');

export type ProgressWriteInput = z.infer<typeof progressWriteSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
