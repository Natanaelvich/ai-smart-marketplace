ALTER TABLE "carts" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "suggested_by_message_id" integer;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_suggested_by_message_id_chat_messages_id_fk" FOREIGN KEY ("suggested_by_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;