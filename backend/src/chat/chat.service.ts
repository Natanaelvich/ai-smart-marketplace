import {
  Injectable,
  BadGatewayException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../shared/database.service';
import {
  chatSessions,
  chatMessages,
  chatMessagesActions,
  ChatMessageAction,
  products,
  carts,
  cartItems,
} from '../shared/schema';
import { eq, and, inArray, lt } from 'drizzle-orm';
import { LlmService } from '../shared/llm.service';

// Add missing columns to carts table definition
// (This is a temporary patch until the schema is updated)
declare module '../shared/schema' {
  interface carts {
    score?: number | null;
    suggestedByMessageId?: number | null;
  }
}

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
    // Use Drizzle to fetch session and messages
    const sessionArr = await this.databaseService.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    if (sessionArr.length === 0) {
      return null;
    }
    const session = sessionArr[0];
    // Fetch messages
    const messages = await this.databaseService.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatSessionId, sessionId));
    // Fetch actions
    const messageIds = messages.map((m) => m.id);
    let actions: ChatMessageAction[] = [];
    if (messageIds.length > 0) {
      actions = await this.databaseService.db
        .select()
        .from(chatMessagesActions)
        .where(inArray(chatMessagesActions.chatMessageId, messageIds));
    }
    // Attach actions to messages
    const messagesWithAction = await Promise.all(
      messages.map(async (msg) => {
        const action = actions.find((a) => a.chatMessageId === msg.id) || null;
        if (msg.messageType !== 'suggest_carts_result') {
          return { ...msg, action };
        }
        // For suggest_carts_result, fetch carts and items
        const cartsForMsg = await this.databaseService.db
          .select()
          .from(carts)
          .where(eq(carts.suggestedByMessageId, msg.id));
        const cartsWithItems = await Promise.all(
          cartsForMsg.map(async (cart) => {
            const items = await this.databaseService.db
              .select()
              .from(cartItems)
              .where(eq(cartItems.cartId, cart.id));
            return { ...cart, items };
          }),
        );
        return { ...msg, action, carts: cartsWithItems };
      }),
    );
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
      throw new NotFoundException('Chat session not found');
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
      throw new NotFoundException('Chat message action not found');
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
        .where(
          lt(
            (products as any).embedding['<=>'](embeddings.embedding),
            0.65,
          ) as any,
        );
      // Group by storeId
      const grouped: Record<
        number,
        { id: number; name: string; price: number; similarity: number }[]
      > = {};
      for (const prod of relevantProducts) {
        if (!grouped[prod.storeId]) grouped[prod.storeId] = [];
        grouped[prod.storeId].push({ ...prod, similarity: 0 }); // Set similarity to 0 if not available
      }
      const relevantProductsGroupedByStore = Object.entries(grouped).map(
        ([store_id, products]) => ({
          store_id: Number(store_id),
          products,
        }),
      );
      if (relevantProductsGroupedByStore.length === 0) {
        throw new NotFoundException(
          'No relevant products found for the given input.',
        );
      }
      const llmResponse = await this.llmService.suggestCarts(
        relevantProductsGroupedByStore,
        payload.input,
      );
      if (!llmResponse || !llmResponse.carts) {
        throw new BadGatewayException(
          'Failed to get cart suggestions from the LLM',
        );
      }
      await this.databaseService.db
        .update(chatMessagesActions)
        .set({ executedAt: new Date() })
        .where(eq(chatMessagesActions.id, actionId));
      const message = await this.addMessageToSession(
        sessionId,
        llmResponse.response,
        'assistant',
        llmResponse.responseId,
        'suggest_carts_result',
      );
      await this.saveSuggestedCarts(
        message.id,
        llmResponse.carts as {
          store_id: number;
          score: number;
          products: { id: number; quantity: number }[];
        }[],
      );
      return actionRow;
    } else {
      throw new InternalServerErrorException(
        `Action type ${actionRow.actionType} is not supported.`,
      );
    }
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

  private async saveSuggestedCarts(
    messageId: number,
    suggestedCarts: {
      store_id: number;
      score: number;
      products: {
        id: number;
        quantity: number;
      }[];
    }[],
  ) {
    for (const cart of suggestedCarts) {
      const [cartResult] = await this.databaseService.db
        .insert(carts)
        .values({
          userId: 1, // TODO: get actual userId
          storeId: cart.store_id,
          score: cart.score,
          suggestedByMessageId: messageId,
          active: false,
        })
        .returning();
      for (const product of cart.products) {
        await this.databaseService.db
          .insert(cartItems)
          .values({
            cartId: cartResult.id,
            productId: product.id,
            quantity: product.quantity,
          })
          .onConflictDoUpdate({
            target: [cartItems.cartId, cartItems.productId],
            set: { quantity: product.quantity },
          });
      }
    }
  }
}
