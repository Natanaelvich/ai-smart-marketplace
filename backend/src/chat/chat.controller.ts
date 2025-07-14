import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ChatService } from './chat.service';
@Controller('chat')
export class ChatController {
  private readonly userId = 1;
  constructor(private readonly chatService: ChatService) {}
  @Post()
  async createChatSession() {
    const session = await this.chatService.createChatSession(this.userId);
    return session;
  }
  @Get(':sessionId')
  async getChatSession(@Param('sessionId') sessionId: string) {
    const session = await this.chatService.getChatSession(Number(sessionId));
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }
}
