import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { DatabaseService } from '../shared/database.service';
import { LlmService } from '../shared/llm.service';

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [CatalogService, DatabaseService, LlmService],
  exports: [CatalogService],
})
export class CatalogModule {}
