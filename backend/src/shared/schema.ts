import {
  pgTable,
  serial,
  varchar,
  integer,
  customType,
  timestamp,
  boolean,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom vector type for pgvector extension
const vector = customType<{ data: number[]; notNull: false; default: false }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value) as number[];
  },
});

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  storeId: integer('store_id').references(() => stores.id),
  embedding: vector('embedding'),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  password: varchar('password', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const carts = pgTable('carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  storeId: integer('store_id').references(() => stores.id),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  score: integer('score'),
  suggestedByMessageId: integer('suggested_by_message_id').references(
    () => chatMessages.id,
  ),
});

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    cartId: integer('cart_id').references(() => carts.id),
    productId: integer('product_id').references(() => products.id),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    uniqueCartProduct: unique('unique_cart_product').on(
      table.cartId,
      table.productId,
    ),
  }),
);

export const chatSessions = pgTable('chat_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  chatSessionId: integer('chat_session_id').references(() => chatSessions.id),
  content: varchar('content', { length: 1000 }).notNull(),
  sender: varchar('sender', { length: 50 }).notNull(), // 'user' | 'assistant'
  openaiMessageId: varchar('openai_message_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  messageType: varchar('message_type', { length: 50 })
    .notNull()
    .default('text'), // 'text' | 'suggest_carts_result'
});

export const chatMessagesActions = pgTable(
  'chat_messages_actions',
  {
    id: serial('id').primaryKey(),
    chatMessageId: integer('chat_message_id').references(() => chatMessages.id),
    actionType: varchar('action_type', { length: 50 }).notNull(), // 'suggest_carts'
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    confirmedAt: timestamp('confirmed_at'),
    executedAt: timestamp('executed_at'),
  },
  (table) => ({
    uniqueAction: unique('unique_chat_message_action').on(
      table.chatMessageId,
      table.actionType,
    ),
  }),
);

// Define relations
export const storesRelations = relations(stores, ({ many }) => ({
  products: many(products),
  carts: many(carts),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  cartItems: many(cartItems),
}));

export const usersRelations = relations(users, ({ many }) => ({
  carts: many(carts),
  chatSessions: many(chatSessions),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [carts.storeId],
    references: [stores.id],
  }),
  cartItems: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));

// Export types
export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type ChatMessageAction = typeof chatMessagesActions.$inferSelect;
export type NewChatMessageAction = typeof chatMessagesActions.$inferInsert;
