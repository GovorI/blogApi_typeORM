import { configModule } from './dynamic-config-module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module';
import { TestingModule } from './modules/testing/testing.module';
import { CoreConfig } from './core/core.config';
import { CoreModule } from './core/core.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthModule } from './modules/jwt/jwt.module';
import { BlogersPlatformModule } from './modules/blogers-platform/blogers-platform.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { configValidationUtility } from './core/utils/config-validation.utility';

// Dynamic module imports based on environment
function getModuleImports(): any[] {
  const baseModules = [
    TypeOrmModule.forRootAsync({
      useFactory: (coreConfig: CoreConfig) => ({
        type: 'postgres',
        host: coreConfig.postresHost,
        port: coreConfig.postresPort,
        username: coreConfig.postresUser,
        password: coreConfig.postresPassword,
        database: coreConfig.postresDatabase,
        autoLoadEntities: true,
        synchronize: false,
        logging: true,
        maxQueryExecutionTime: 1000,
      }),
      inject: [CoreConfig],
    }),
    UserAccountsModule,
    BlogersPlatformModule,
    NotificationsModule,
    JwtAuthModule,
    configModule,
    CoreModule,
  ];

  // Add TestingModule only in testing or development environment
  const includeTestingModule = configValidationUtility.convertToBoolean(
    process.env.INCLUDE_TESTING_MODULE,
  );
  if (includeTestingModule) {
    baseModules.push(TestingModule);
  }

  return baseModules;
}

@Module({
  imports: getModuleImports(),
  controllers: [AppController],
  providers: [AppService, CoreConfig],
})
export class AppModule {}
