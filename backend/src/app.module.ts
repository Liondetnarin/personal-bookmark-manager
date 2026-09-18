import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import type { AppConfig } from './config.js';
import { AccessTokenVerifier } from './auth/access-token.verifier.js';
import { AuthGuard } from './auth/auth.guard.js';
import { DatabaseService } from './database/database.service.js';
import { HttpErrorFilter } from './http-error.filter.js';
import { MeController } from './me.controller.js';
import { OwnerService } from './auth/owner.service.js';
import { CollectionsController } from './collections/collections.controller.js';
import { CollectionsService } from './collections/collections.service.js';
import { BookmarksController, CollectionBookmarksController } from './bookmarks/bookmarks.controller.js';
import { BookmarksService } from './bookmarks/bookmarks.service.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [MeController, CollectionsController, BookmarksController, CollectionBookmarksController],
      providers: [
        OwnerService,
        CollectionsService,
        BookmarksService,
        { provide: AccessTokenVerifier, useFactory: () => new AccessTokenVerifier(config) },
        { provide: DatabaseService, useFactory: () => new DatabaseService(config.databaseUrl) },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_FILTER, useClass: HttpErrorFilter },
      ],
    };
  }
}
