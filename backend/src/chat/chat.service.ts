import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../shared/database.service';
import { chatSessions } from '../shared/schema';
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
    const result = await this.databaseService.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    return result[0];
  }
}
