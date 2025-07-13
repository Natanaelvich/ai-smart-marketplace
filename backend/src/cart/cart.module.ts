import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { DatabaseService } from '../shared/database.service';

@Module({
  imports: [],
  controllers: [CartController],
  providers: [CartService, DatabaseService],
  exports: [],
})
export class CartModule {}
