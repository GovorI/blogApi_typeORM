import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';

export const configModule = ConfigModule.forRoot({
  envFilePath: [
    process.env.ENV_FILE_PATH?.trim() || '',
    path.resolve(process.cwd(), 'src', 'env', `.env.${nodeEnv}.local`),
    path.resolve(process.cwd(), 'src', 'env', `.env.${nodeEnv}`),
    path.resolve(process.cwd(), 'src', 'env', `.env.production`),
  ],
  isGlobal: true,
});
