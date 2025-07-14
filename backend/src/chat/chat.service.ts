import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../shared/database.service';
import { chatSessions, chatMessages } from '../shared/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ChatService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createChatSession(userId: number) {
    const result = await this.databaseService.db
      .insert(chatSessions)
      .values({ userId })
      .returning({ id: chatSessions.id });
    return result[0];
  }
  async getChatSession(sessionId: number) {
    // Buscar a sessão
    const sessionArr = await this.databaseService.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    if (sessionArr.length === 0) {
      return null;
    }
    const session = sessionArr[0];
    // Buscar mensagens da sessão
    const messages = await this.databaseService.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatSessionId, sessionId));
    return {
      ...session,
      messages,
    };
  }

  async addUserMessage(sessionId: number, content: string) {
    return this.addMessageToSession(sessionId, content, 'user');
  }

  private async addMessageToSession(
    sessionId: number,
    content: string,
    sender: 'user' | 'assistant',
    openaiMessageId?: string,
    messageType: 'text' | 'suggest_carts_result' = 'text',
  ) {
    const result = await this.databaseService.db
      .insert(chatMessages)
      .values({
        chatSessionId: sessionId,
        content,
        sender,
        openaiMessageId,
        messageType,
      })
      .returning();
    return result[0];
  }
}
