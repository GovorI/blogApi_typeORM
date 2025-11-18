// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { SessionService } from './session-service';
//
// @Injectable()
// export class SessionCleanupService implements OnModuleInit {
//   private readonly logger = new Logger(SessionCleanupService.name);
//   private cleanupInterval: NodeJS.Timeout | null = null;
//
//   constructor(private readonly sessionService: SessionService) {}
//
//   onModuleInit() {
//     // Start cleanup every hour (3600000 ms)
//     this.startCleanupSchedule();
//   }
//
//   private startCleanupSchedule() {
//     const cleanup = async () => {
//       try {
//         await this.handleExpiredSessionsCleanup();
//       } catch (error) {
//         this.logger.error('Error in scheduled cleanup:', error);
//       }
//     };
//
//     // Initial call
//     cleanup();
//
//     // Schedule subsequent calls
//     this.cleanupInterval = setInterval(
//       cleanup,
//       60 * 60 * 1000, // 1 hour
//     );
//
//     this.logger.log('Session cleanup schedule started (runs every hour)');
//   }
//
//   async handleExpiredSessionsCleanup() {
//     try {
//       const deletedCount = await this.sessionService.cleanupExpiredSessions();
//       if (deletedCount > 0) {
//         this.logger.log(`Cleaned up ${deletedCount} expired sessions`);
//       }
//     } catch (error) {
//       this.logger.error('Failed to cleanup expired sessions', error);
//     }
//   }
//
//   onModuleDestroy() {
//     if (this.cleanupInterval) {
//       clearInterval(this.cleanupInterval);
//       this.logger.log('Session cleanup schedule stopped');
//     }
//   }
// }
