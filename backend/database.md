## Diagram

```mermaid
erDiagram

    cart_items {
        id integer PK "not null"
        cart_id integer FK "null"
        product_id integer FK "null"
        quantity integer "not null"
        cart_id integer "null"
        product_id integer "null"
        created_at timestamp_without_time_zone "null"
    }

    carts {
        id integer PK "not null"
        store_id integer FK "null"
        suggested_by_message_id integer FK "null"
        user_id integer FK "null"
        active boolean "null"
        score integer "null"
        created_at timestamp_without_time_zone "null"
    }

    chat_messages {
        id integer PK "not null"
        chat_session_id integer FK "null"
        content character_varying "not null"
        message_type character_varying "not null"
        sender character_varying "not null"
        openai_message_id character_varying "null"
        created_at timestamp_without_time_zone "null"
    }

    chat_messages_actions {
        id integer PK "not null"
        chat_message_id integer FK "null"
        action_type character_varying "not null"
        payload jsonb "not null"
        chat_message_id integer "null"
        confirmed_at timestamp_without_time_zone "null"
        created_at timestamp_without_time_zone "null"
        executed_at timestamp_without_time_zone "null"
    }

    chat_sessions {
        id integer PK "not null"
        user_id integer FK "null"
        created_at timestamp_without_time_zone "null"
    }

    products {
        id integer PK "not null"
        store_id integer FK "null"
        name character_varying "not null"
        price integer "not null"
        embedding vector "null"
    }

    stores {
        id integer PK "not null"
        name character_varying "not null"
    }

    users {
        id integer PK "not null"
        email character_varying "not null"
        name character_varying "not null"
        password character_varying "not null"
        created_at timestamp_without_time_zone "null"
    }

    carts ||--o{ cart_items : "cart_items(cart_id) -> carts(id)"
    chat_messages ||--o{ carts : "carts(suggested_by_message_id) -> chat_messages(id)"
    chat_messages ||--o{ chat_messages_actions : "chat_messages_actions(chat_message_id) -> chat_messages(id)"
    chat_sessions ||--o{ chat_messages : "chat_messages(chat_session_id) -> chat_sessions(id)"
    products ||--o{ cart_items : "cart_items(product_id) -> products(id)"
    stores ||--o{ carts : "carts(store_id) -> stores(id)"
    stores ||--o{ products : "products(store_id) -> stores(id)"
    users ||--o{ carts : "carts(user_id) -> users(id)"
    users ||--o{ chat_sessions : "chat_sessions(user_id) -> users(id)"
```

## Indexes

### `cart_items`

- `cart_items_pkey`
- `unique_cart_product`

### `carts`

- `carts_pkey`

### `chat_messages`

- `chat_messages_pkey`

### `chat_messages_actions`

- `chat_messages_actions_pkey`
- `unique_chat_message_action`

### `chat_sessions`

- `chat_sessions_pkey`

### `products`

- `products_pkey`

### `stores`

- `stores_pkey`

### `users`

- `users_email_unique`
- `users_pkey`
