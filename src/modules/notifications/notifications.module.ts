import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
import { NotificationsConfig } from './notifications.config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService<any, true>) => {
        const notificationsConfig = new NotificationsConfig(configService);
        return {
          transport: {
            host: notificationsConfig.mailHost,
            port: notificationsConfig.mailPort,
            secure: notificationsConfig.mailSecure,
            auth: {
              user: notificationsConfig.mailUser,
              pass: notificationsConfig.mailPass,
            },
            tls: {
              rejectUnauthorized: notificationsConfig.mailTlsRejectUnauthorized,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [NotificationsConfig, EmailService],
  exports: [NotificationsConfig, EmailService],
})
export class NotificationsModule { }
