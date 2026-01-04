import { Module } from '@nestjs/common';
import { TestingController } from './testing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseCleanupService } from './database-cleanup.service';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), UserAccountsModule],
  controllers: [TestingController],
  providers: [DatabaseCleanupService],
  exports: [],
})
export class TestingModule {}
