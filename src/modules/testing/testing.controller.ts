import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimiterService } from '../../core/services/rate-limiter.service';
import { DatabaseCleanupService } from './database-cleanup.service';

@Controller('testing')
export class TestingController {
  constructor(
    private readonly databaseCleanupService: DatabaseCleanupService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  @Delete('all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll() {
    try {
      await this.databaseCleanupService.clearAllTables();
      // Clear rate limiter cache
      this.rateLimiterService.clearAll();
      return {
        status: 'succeeded',
      };
    } catch (e) {
      console.log('error deleting all data', e);
      throw e;
    }
  }
}
