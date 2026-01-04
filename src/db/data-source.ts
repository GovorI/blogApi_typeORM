import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';

const envFilePaths = [
  process.env.ENV_FILE_PATH?.trim(),
  path.resolve(process.cwd(), 'src', 'env', `.env.${nodeEnv}.local`),
  path.resolve(process.cwd(), 'src', 'env', `.env.${nodeEnv}`),
  path.resolve(process.cwd(), 'src', 'env', `.env.production`),
].filter(Boolean) as string[];

for (const envFilePath of envFilePaths) {
  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath, override: false });
  }
}

// Этот DataSource используется ТОЛЬКО для TypeORM CLI (миграции).
// NestJS поднимает соединение через TypeOrmModule.forRootAsync в AppModule.
//
// Важно: для запуска миграций тебе нужно прокинуть переменные окружения
// (POSTGRES_HOST/PORT/USER/PASSWORD/DATABASE) точно так же, как для запуска приложения.

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,

  // Миграции выполняем явно через CLI, поэтому auto sync выключен
  synchronize: false,

  // ВАЖНО: в проекте включен autoLoadEntities в NestJS-конфиге.
  // Для CLI нам надо явно перечислить паттерн entity.
  entities: ['src/**/*entity{.ts,.js}'],

  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
});
