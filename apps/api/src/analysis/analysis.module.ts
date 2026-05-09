import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
