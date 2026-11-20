import { z } from 'zod';
import { isValidTimeZone } from '../progress/dates';

export const createFamilySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Название семьи должно содержать хотя бы 2 символа')
      .max(80, 'Название семьи слишком длинное'),
    timezone: z
      .string()
      .trim()
      .min(1, 'Укажите часовой пояс')
      .max(80)
      .default('Europe/Moscow')
      .refine(isValidTimeZone, 'Неизвестный часовой пояс'),
  })
  .strict();

export const joinFamilySchema = z
  .object({
    token: z.string().trim().min(20, 'Приглашение недействительно').max(200, 'Приглашение недействительно'),
  })
  .strict();

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;
