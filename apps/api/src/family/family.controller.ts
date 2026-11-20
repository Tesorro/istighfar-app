import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FamilyService } from './family.service';
import { createFamilySchema, joinFamilySchema, type CreateFamilyInput, type JoinFamilyInput } from './family.schemas';

@Controller('family')
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createFamilySchema)) body: CreateFamilyInput,
  ) {
    return this.family.create(user, body);
  }

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.family.getForUser(user);
  }

  @Post('invitations')
  invite(@CurrentUser() user: AuthUser) {
    return this.family.createInvitation(user);
  }

  @HttpCode(200)
  @Post('join')
  join(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(joinFamilySchema)) body: JoinFamilyInput,
  ) {
    return this.family.join(user, body.token);
  }
}
