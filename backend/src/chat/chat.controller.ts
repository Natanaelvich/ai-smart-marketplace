import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Body,
  BadRequestException,
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
  @Post(':sessionId/messages')
  async addUserMessage(
    @Param('sessionId') sessionId: number,
    @Body('content') content: string,
  ) {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('Content must be a non-empty string');
    }
    const message = await this.chatService.addUserMessage(sessionId, content);
    return message;
  }
  @Post(':sessionId/actions/:actionId/confirm')
  async confirmAction(
    @Param('sessionId') sessionId: number,
    @Param('actionId') actionId: number,
  ) {
    await this.chatService.confirmAction(sessionId, actionId);
    // No content on success
  }
}
