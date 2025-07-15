import {
  Injectable,
  BadGatewayException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../shared/database.service';
import {
  chatSessions,
  chatMessages,
  chatMessagesActions,
  ChatMessageAction,
  products,
} from '../shared/schema';
import { eq, and, inArray, lt } from 'drizzle-orm';
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
    // (previousMessageId logic removed as it is no longer used)

    const userMessage = await this.addMessageToSession(
      sessionId,
      content,
      'user',
    );
    const llmResponse = (await this.llmService.answerMessage(content)) as {
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

  async confirmAction(sessionId: number, actionId: number) {
    // Check if session exists
    const session = await this.databaseService.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId));
    if (session.length === 0) {
      return null;
    }
    // Find the action and ensure it belongs to a message in this session
    const action = await this.databaseService.db
      .select({
        id: chatMessagesActions.id,
        chatMessageId: chatMessagesActions.chatMessageId,
        actionType: chatMessagesActions.actionType,
        payload: chatMessagesActions.payload,
        confirmedAt: chatMessagesActions.confirmedAt,
        executedAt: chatMessagesActions.executedAt,
        chatSessionId: chatMessages.chatSessionId,
        messageId: chatMessages.id,
      })
      .from(chatMessagesActions)
      .innerJoin(
        chatMessages,
        eq(chatMessagesActions.chatMessageId, chatMessages.id),
      )
      .where(
        and(
          eq(chatMessagesActions.id, actionId),
          eq(chatMessages.chatSessionId, sessionId),
        ),
      );
    if (action.length === 0) {
      return null;
    }
    const actionRow = action[0];
    if (actionRow.confirmedAt) {
      throw new ConflictException('This action has already been confirmed.');
    }
    // Update confirmed_at
    await this.databaseService.db
      .update(chatMessagesActions)
      .set({ confirmedAt: new Date() })
      .where(eq(chatMessagesActions.id, actionId));
    if (actionRow.actionType === 'suggest_carts') {
      const payload = actionRow.payload as { input: string };
      const embeddings = await this.llmService.embedInput(payload.input);
      if (!embeddings) {
        throw new BadGatewayException('Failed to get embeddings from the LLM');
      }
      // Find relevant products grouped by store (embedding <=> product.embedding < 0.65)
      const relevantProducts = await this.databaseService.db
        .select({
          storeId: products.storeId,
          id: products.id,
          name: products.name,
          price: products.price,
        })
        .from(products)
        .where(lt(products.embedding['<=>'](embeddings.embedding), 0.65));
      // Group by storeId
      const grouped = relevantProducts.reduce(
        (acc, prod) => {
          if (!acc[prod.storeId]) acc[prod.storeId] = [];
          acc[prod.storeId].push(prod);
          return acc;
        },
        {} as Record<number, typeof relevantProducts>,
      );
      console.dir(grouped, { depth: null });
    } else {
      throw new InternalServerErrorException(
        `Action type ${actionRow.actionType} is not supported.`,
      );
    }
    // Return the updated action
    const updated = await this.databaseService.db
      .select()
      .from(chatMessagesActions)
      .where(eq(chatMessagesActions.id, actionId));
    return updated[0];
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
