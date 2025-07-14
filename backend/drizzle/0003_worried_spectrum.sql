CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_session_id" integer,
	"content" varchar(1000) NOT NULL,
	"sender" varchar(50) NOT NULL,
	"openai_message_id" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"message_type" varchar(50) DEFAULT 'text' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;