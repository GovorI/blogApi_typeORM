import { Module } from '@nestjs/common';
import { TestingController } from './testing.controller';
import { RateLimiterService } from '../../core/services/rate-limiter.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseCleanupService } from './database-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [TestingController],
  providers: [RateLimiterService, DatabaseCleanupService],
  exports: [],
})
export class TestingModule {}
