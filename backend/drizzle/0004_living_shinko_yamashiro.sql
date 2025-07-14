CREATE TABLE "chat_messages_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_message_id" integer,
	"action_type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"executed_at" timestamp,
	CONSTRAINT "unique_chat_message_action" UNIQUE("chat_message_id","action_type")
);
--> statement-breakpoint
ALTER TABLE "chat_messages_actions" ADD CONSTRAINT "chat_messages_actions_chat_message_id_chat_messages_id_fk" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;