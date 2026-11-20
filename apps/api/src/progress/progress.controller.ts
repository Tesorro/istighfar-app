import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  historyQuerySchema,
  progressIdSchema,
  progressWriteSchema,
  type HistoryQuery,
  type ProgressWriteInput,
} from './progress.schemas';
import { ProgressService } from './progress.service';

@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('family/progress')
  familyProgress(@CurrentUser() user: AuthUser) {
    return this.progress.familyProgress(user);
  }

  @Get('progress/today')
  today(@CurrentUser() user: AuthUser) {
    return this.progress.today(user);
  }

  @Get('progress/history')
  history(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ) {
    return this.progress.history(user, query);
  }

  @Post('progress')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(progressWriteSchema)) body: ProgressWriteInput,
  ) {
    return this.progress.create(user, body);
  }

  @Patch('progress/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(progressIdSchema)) id: string,
    @Body(new ZodValidationPipe(progressWriteSchema)) body: ProgressWriteInput,
  ) {
    return this.progress.update(user, id, body);
  }
}
