import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Имя должно содержать хотя бы 2 символа').max(80, 'Имя слишком длинное'),
    email: z.email('Введите корректный email').trim().toLowerCase(),
    password: z
      .string()
      .min(8, 'Пароль должен содержать хотя бы 8 символов')
      .max(72, 'Пароль слишком длинный'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email('Введите корректный email').trim().toLowerCase(),
    password: z.string().min(1, 'Введите пароль').max(72, 'Пароль слишком длинный'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
