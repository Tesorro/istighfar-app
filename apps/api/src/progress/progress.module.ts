import { Module } from '@nestjs/common';
import { FamilyModule } from '../family/family.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [FamilyModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
