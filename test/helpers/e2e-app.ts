import { INestApplication } from '@nestjs/common';

export async function initAppAndListen(
  app: INestApplication,
  host = '127.0.0.1',
): Promise<void> {
  await app.init();
  await app.listen(0, host);
}
