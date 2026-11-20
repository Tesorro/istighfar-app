import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value ?? {});
    if (result.success) {
      return result.data;
    }

    const message = result.error.issues
      .map((issue) => {
        if (issue.code === 'unrecognized_keys') {
          return 'Лишние поля недопустимы';
        }
        return issue.message;
      })
      .join('. ');

    throw new BadRequestException(message || 'Проверьте введённые данные');
  }
}
