import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function clearDb(app: INestApplication): Promise<void> {
  await request(app.getHttpServer())
    .delete('/api/testing/all-data')
    .expect(204);
}
