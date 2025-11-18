import { INestApplication } from '@nestjs/common';

export function cookieSetup(app: INestApplication) {
  // Enable cookie parsing without secrets (as requested)
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  const express = require('express');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}
