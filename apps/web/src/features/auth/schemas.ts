import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Имя должно содержать хотя бы 2 символа').max(80, 'Имя слишком длинное'),
    email: z.email('Введите корректный email'),
    password: z.string().min(8, 'Пароль должен содержать хотя бы 8 символов').max(72, 'Пароль слишком длинный'),
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });

export const reportSchema = z.object({
  count: z
    .string()
    .trim()
    .min(1, 'Введите количество')
    .regex(/^\d+$/, 'Введите целое число от 0 до 100 000')
    .refine((value) => Number(value) <= 100_000, 'Введите целое число от 0 до 100 000'),
});

export const familySchema = z.object({
  name: z.string().trim().min(2, 'Название должно содержать хотя бы 2 символа').max(80, 'Название слишком длинное'),
  timezone: z.string().min(1, 'Выберите часовой пояс'),
});

export const joinSchema = z.object({
  token: z.string().trim().min(20, 'Вставьте приглашение').max(200, 'Приглашение слишком длинное'),
});
