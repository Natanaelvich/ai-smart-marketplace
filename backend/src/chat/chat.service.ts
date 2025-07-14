import { Injectable, BadGatewayException } from '@nestjs/common';
import { DatabaseService } from '../shared/database.service';
import {
  chatSessions,
  chatMessages,
  chatMessagesActions,
  ChatMessageAction,
} from '../shared/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { LlmService } from '../shared/llm.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
  ) {}

  async createChatSession(userId: number) {
    const result = await this.databaseService.db
      .insert(chatSessions)
      .values({ userId })
      .returning({ id: chatSessions.id });
    return result[0];
  }

  async getChatSession(sessionId: number) {
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
    // Buscar ações relacionadas às mensagens
    const messageIds = messages.map((m) => m.id);
    let actions: ChatMessageAction[] = [];
    if (messageIds.length > 0) {
      actions = await this.databaseService.db
        .select()
        .from(chatMessagesActions)
        .where(inArray(chatMessagesActions.chatMessageId, messageIds));
    }
    // Agregar action em cada mensagem
    const messagesWithAction = messages.map((msg) => ({
      ...msg,
      action: actions.find((a) => a.chatMessageId === msg.id) || null,
    }));
    return {
      ...session,
      messages: messagesWithAction,
    };
  }

  async addUserMessage(sessionId: number, content: string) {
    // Buscar o último openaiMessageId do assistente
    const lastAssistantMsg = await this.databaseService.db
      .select({ openaiMessageId: chatMessages.openaiMessageId })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chatSessionId, sessionId),
          eq(chatMessages.sender, 'assistant'),
        ),
      )
      .orderBy(chatMessages.createdAt)
      .limit(1);
    const previousMessageId =
      lastAssistantMsg.length > 0 ? lastAssistantMsg[0].openaiMessageId : null;

    const userMessage = await this.addMessageToSession(
      sessionId,
      content,
      'user',
    );
    const llmResponse = (await this.llmService.answerMessage(
      content,
      previousMessageId,
    )) as {
      message: string;
      action: { type: string; payload?: unknown };
      responseId: string;
    } | null;
    if (!llmResponse) {
      throw new BadGatewayException('Failed to get a response from LLM');
    }
    const llmMessage = await this.addMessageToSession(
      sessionId,
      llmResponse.message,
      'assistant',
      llmResponse.responseId,
      'text',
    );
    if (llmResponse.action.type === 'suggest_carts') {
      await this.databaseService.db
        .insert(chatMessagesActions)
        .values({
          chatMessageId: llmMessage.id,
          actionType: llmResponse.action.type,
          payload: llmResponse.action.payload as object,
        })
        .onConflictDoNothing();
    }
    return userMessage;
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
