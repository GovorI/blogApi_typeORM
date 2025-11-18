import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { NotificationsConfig } from './notifications.config';

@Injectable()
export class EmailService {
  constructor(
    private mailerService: MailerService,
    private notificationsConfig: NotificationsConfig,
  ) {}

  async sendConfirmationEmail(email: string, code: string): Promise<void> {
    await this.mailerService.sendMail({
      from: this.notificationsConfig.mailFrom,
      to: email,
      subject: 'confirm registration',
      html: `<h1>Thank for your registration</h1>
 <p>To finish registration please follow the link below:
     <a href='https://somesite.com/confirm-email?code=${code}'>complete registration</a>
 </p>`,
    });
  }

  async sendPasswordRecoveryEmail(email: string, code: string): Promise<void> {
    await this.mailerService.sendMail({
      from: this.notificationsConfig.mailFrom,
      to: email,
      subject: 'password recovery',
      html: `<p>For reset your password please follow the link below:
     <a href='https://somesite.com/confirm-email?code=${code}'>password recovery</a>
 </p>`,
    });
  }
}
