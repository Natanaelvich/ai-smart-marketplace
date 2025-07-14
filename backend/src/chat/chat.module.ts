import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { DatabaseService } from '../shared/database.service';
import { ChatService } from './chat.service';
@Module({
  controllers: [ChatController],
  providers: [DatabaseService, ChatService],
})
export class ChatModule {}
