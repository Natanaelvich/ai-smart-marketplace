import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { DatabaseService } from '../shared/database.service';

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [CatalogService, DatabaseService],
  exports: [],
})
export class CatalogModule {}
