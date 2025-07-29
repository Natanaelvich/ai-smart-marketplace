import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { zodTextFormat } from 'openai/helpers/zod';

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

const suggestCartsSchema = z.object({
  carts: z.array(
    z.object({
      store_id: z.number(),
      score: z.number(),
      products: z.array(
        z.object({
          id: z.number(),
          quantity: z.number(),
          name: z.string(),
        }),
      ),
    }),
  ),
  response: z.string(),
});

@Injectable()
export class LlmService {
  static readonly ANSWER_MESSAGE_PROMPT = `Você é um assistente de marketplace especializado em identificar ingredientes para compra. Seu papel é APENAS identificar quais produtos o usuário precisa comprar, não dar dicas de preparo.

        - 'send_message': Use essa ação para responder o usuário quando:
          * Estiver apenas conversando ou fazendo perguntas gerais
          * Precisar de mais informações antes de poder sugerir um carrinho
          * Estiver explicando algo ou dando dicas

        - 'suggest_carts': Use essa ação quando o usuário:
          * Solicitar explicitamente para montar um carrinho de compras
          * Pedir ingredientes para uma receita específica
          * Confirmar que quer que você monte o carrinho
          * Usar frases como "montar carrinho", "fazer carrinho", "adicionar ao carrinho", "confirma", "sim", etc.

        REGRAS IMPORTANTES:
        1. Seja ASSERTIVO - quando o usuário pedir para montar carrinho, use 'suggest_carts' imediatamente
        2. NÃO peça confirmação desnecessária se o usuário já confirmou
        3. Se o usuário disser "sim" ou "confirma" após você ter sugerido algo, use 'suggest_carts'
        4. Para receitas, sugira ingredientes básicos sem perguntar detalhes desnecessários
        5. Use 'suggest_carts' quando tiver informações suficientes para montar um carrinho útil
        6. FOQUE APENAS EM INGREDIENTES - não dê dicas de preparo, não explique como fazer a receita
        7. Seja DIRETO - identifique os ingredientes necessários e monte o carrinho
        8. SEMPRE retorne uma mensagem clara no campo "message" - nunca deixe vazio

        Exemplos:
        - Usuário: "Sugira uma receita fácil para o jantar" → 'send_message' (explicar receita)
        - Usuário: "Montar carrinho para macarrão alho e óleo" → 'suggest_carts' com mensagem: "Vou montar um carrinho com os ingredientes para macarrão alho e óleo."
        - Usuário: "Sim, pode montar o carrinho" → 'suggest_carts' com mensagem: "Perfeito! Vou montar o carrinho com os ingredientes necessários."
        - Usuário: "Confirma" → 'suggest_carts' com mensagem: "Confirmado! Montando o carrinho com os ingredientes."

        No campo "input" da ação 'suggest_carts', inclua:
        - Descrição da receita/necessidade
        - Lista dos ingredientes principais necessários
        - Quantidades aproximadas

        LEMBRE-SE: 
        - Você é um assistente de COMPRAS, não um chef. Foque em identificar ingredientes, não em dar dicas de preparo
        - SEMPRE retorne uma mensagem clara no campo "message" quando usar 'suggest_carts'
        - A mensagem deve explicar o que você está fazendo (montando carrinho)`;
  static readonly SUGGEST_CARTS_PROMPT = `
  Você é um assistente de marketplace especializado em identificar ingredientes para compra. Crie carrinhos de compras por loja com base nos produtos sugeridos.

        INSTRUÇÕES:
        - Analise o input do usuário e identifique os ingredientes necessários
        - Monte carrinhos de compras por loja usando APENAS os produtos disponíveis fornecidos
        - Calcule quantidades apropriadas para a receita/necessidade
        - Atribua um score de 0-100 baseado na completude do carrinho
        - FOQUE APENAS EM INGREDIENTES - não dê dicas de preparo

        REGRAS:
        - Use APENAS os IDs dos produtos fornecidos na lista
        - Se um produto não estiver disponível, não o inclua no carrinho
        - Para produtos como ovos, farinha, etc., sugira quantidades realistas
        - Score alto (80-100): todos os ingredientes principais disponíveis
        - Score médio (50-79): maioria dos ingredientes disponíveis
        - Score baixo (20-49): poucos ingredientes disponíveis
        - NÃO explique como preparar a receita, apenas liste os ingredientes

        EXEMPLO DE RESPOSTA:
        {
          "carts": [
            {
              "store_id": 1,
              "score": 95,
              "products": [
                { "id": 1, "name": "farinha de trigo 1kg", "quantity": 1 },
                { "id": 2, "name": "açúcar refinado 1kg", "quantity": 1 },
                { "id": 3, "name": "ovos 12 unidades", "quantity": 1 }
              ]
            }
          ],
          "response": "Carrinhos sugeridos com base nos produtos disponíveis."
        }

        IMPORTANTE: 
        - Sempre retorne carrinhos válidos com produtos reais da lista fornecida
        - Foque apenas em ingredientes, não em dicas de preparo
        - Seja direto e objetivo
        - SEMPRE use exatamente esta mensagem no campo "response": "Carrinhos sugeridos com base nos produtos disponíveis."`;
  private client: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      webhookSecret: this.configService.get<string>('OPENAI_WEBHOOK_SECRET'),
    });
  }
  async answerMessage(
    message: string,
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
    }> = [],
  ): Promise<(AnswerMessage & { responseId: string }) | null> {
    try {
      const messages = [
        {
          role: 'system' as const,
          content: LlmService.ANSWER_MESSAGE_PROMPT,
        },
        ...conversationHistory,
        {
          role: 'user' as const,
          content: message,
        },
      ];

      const response = await this.client.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages,
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

  async suggestCarts(
    relevantProductsByStore: {
      store_id: number;
      products: {
        id: number;
        name: string;
        price: number;
        similarity: number;
      }[];
    }[],
    input: string,
  ) {
    try {
      const response = await this.client.responses.parse({
        model: 'gpt-4.1-nano',
        instructions: LlmService.SUGGEST_CARTS_PROMPT,
        input: `Input do usuário: ${input}\n\nProdutos disponíveis por loja:\n${JSON.stringify(
          relevantProductsByStore,
          null,
          2,
        )}`,
        text: {
          format: zodTextFormat(suggestCartsSchema, 'suggestCartsSchema'),
        },
      });
      if (!response.output_parsed) {
        console.error('No parsed output in response:', response);
        return null;
      }
      return {
        ...response.output_parsed,
        responseId: response.id,
      };
    } catch (error) {
      console.error('Error in LlmService.suggestCarts:', error);
      return null;
    }
  }
}
