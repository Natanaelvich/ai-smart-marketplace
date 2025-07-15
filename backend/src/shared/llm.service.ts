import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const answerMessageSchema = z.object({
  message: z.string(),
  action: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('send_message'),
    }),
    z.object({
      type: z.literal('suggest_carts'),
      payload: z.object({
        input: z.string(),
      }),
    }),
  ]),
});
const answerMessageJsonSchemaFull = zodToJsonSchema(
  answerMessageSchema,
  'answerSchema',
);
const answerMessageJsonSchema = {
  name: 'answerSchema',
  schema: answerMessageJsonSchemaFull.definitions.answerSchema,
};
type AnswerMessage = z.infer<typeof answerMessageSchema>;

@Injectable()
export class LlmService {
  static readonly ANSWER_MESSAGE_PROMPT = `Você é um assistente de um marketplace com conhecimentos gastronômicos. Identifique qual ação o usuário está solicitando:
        - 'send_message': Use essa ação para responder o usuário antes de commitar alguma ação. Caso o usuário tenha solicitado uma ação, mas você ainda precise de mais informações, use essa ação para perguntar ao usuário. Informe em "message" a resposta do assistente.
        - 'suggest_carts': Use essa ação apenas quando já tiver todas as informações necessárias para sugerir um carrinho de compras. Informe em "input" uma descrição do que o usuário está solicitando, junto a uma lista de produtos que você sugeriria para o carrinho. A mensagem que acompanha essa ação deve ser uma confirmação para o usuário, perguntando se ele confirma a ação de montar o carrinho de compras.
        Exemplo:
          - Mensagem do usuário: "Montar carrinho para receita de bolo de chocolate"
          - Resposta do assistente: "Você solicitou um bolo de chocolate. Confirma a ação para que possa montar o carrinho de compras?"
          - Input: "Bolo de chocolate. Ingredientes: farinha, açúcar, ovos, chocolate meio amargo, fermento em pó."
        Não use a ação 'suggest_carts' para responder ao usuário, apenas para sugerir um carrinho de compras. Use a ação 'send_message' para responder ao usuário.
        Não precisa ir muito afundo em detalhes, se o usuário solicitar um bolo de chocolate, você pode sugerir um carrinho com ingredientes básicos, ao invés de perguntar se ele prefere chocolate meio amargo ou ao leite ou pedir detalhes sobre a receita, pois o usuário pode inserir esses detalhes depois.`;
  private client: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      webhookSecret: this.configService.get<string>('OPENAI_WEBHOOK_SECRET'),
    });
  }
  async answerMessage(
    message: string,
  ): Promise<(AnswerMessage & { responseId: string }) | null> {
    try {
      const response = await this.client.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: LlmService.ANSWER_MESSAGE_PROMPT,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        response_format: {
          type: 'json_schema',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          json_schema: answerMessageJsonSchema as any,
        },
      });
      if (
        !response.choices[0]?.message?.parsed ||
        typeof response.choices[0].message.parsed !== 'object'
      ) {
        return null;
      }

      return {
        ...(response.choices[0].message.parsed as Record<string, unknown>),
        responseId: response.id,
      };
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async batchEmbedProducts(products: { id: number; name: string }[]) {
    const jsonlFile = products
      .map((product) =>
        JSON.stringify({
          custom_id: product.id.toString(),
          method: 'POST',
          url: '/v1/embeddings',
          body: {
            model: 'text-embedding-3-small',
            input: product.name,
          },
        }),
      )
      .join('\n');

    const uploadedFile = await this.client.files.create({
      file: new File([jsonlFile], 'products.jsonl', {
        type: 'application/jsonl',
      }),
      purpose: 'batch',
    });

    if (!uploadedFile.id) {
      console.error('Failed to upload file for batch embedding');
      return null;
    }

    await this.client.batches.create({
      input_file_id: uploadedFile.id,
      completion_window: '24h',
      endpoint: '/v1/embeddings',
    });
  }

  async handleWebhookEvent(rawBody: string, headers: Record<string, string>) {
    console.log('LlmService.handleWebhookEvent called');
    const event = await this.client.webhooks.unwrap(rawBody, headers);

    if (event.type !== 'batch.completed') {
      console.warn('Received non-batch event:', event.type);
      return;
    }

    console.log('Batch completed event received:', event.data.id);
    const batch = await this.client.batches.retrieve(event.data.id);
    if (!batch || !batch.output_file_id) {
      console.error('Batch output file not found:', event.data.id);
      return;
    }

    console.log('Batch output file ID:', batch.output_file_id);
    const outputFile = await this.client.files.content(batch.output_file_id);
    const results = (await outputFile.text())
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        const data = JSON.parse(line) as {
          custom_id: string;
          response: {
            body: CreateEmbeddingResponse;
          };
        };

        if (
          !data.response ||
          !data.response.body ||
          !data.response.body.data ||
          data.response.body.data.length === 0
        ) {
          console.warn('Invalid response data:', data);
          return null;
        }

        return {
          productId: data.custom_id,
          embedding: data.response.body.data[0].embedding,
        };
      })
      .filter((result) => result !== null);

    return results;
  }

  async embedInput(input: string): Promise<{ embedding: number[] } | null> {
    try {
      console.log('LlmService.embedInput called with input:', input);
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: input,
      });
      return { embedding: response.data[0].embedding };
    } catch (error) {
      console.error('Error in LlmService.embedInput:', error);
      return null;
    }
  }
}
