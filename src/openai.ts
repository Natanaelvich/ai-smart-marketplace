import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
import { z } from 'zod';
import { produtosEmEstoque, produtosEmFalta } from './database';

const schema = z.object({
  produtos: z.array(z.string()),
});

const client = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'produtos_em_estoque',
      description: 'Lista os produtos que estão em estoque.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: 'function',
    function: {
      name: 'produtos_em_falta',
      description: 'Lista os produtos que estão em falta.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

const generateCompletion = async (
  messages: ChatCompletionMessageParam[],
  format: ReturnType<typeof zodResponseFormat<typeof schema>>
): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 100,
    response_format: format,
    tools,
    messages,
  });

  if (completion.choices[0].message.refusal) {
    throw new Error('Refusal');
  }

  const { tool_calls } = completion.choices[0].message;
  if (tool_calls && tool_calls.length > 0) {
    const toolsMap = {
      produtos_em_estoque: produtosEmEstoque,
      produtos_em_falta: produtosEmFalta,
    };

    // Adicionar a mensagem do assistente com as tool calls
    messages.push(completion.choices[0].message);

    // Processar todas as tool calls
    for (const tool_call of tool_calls) {
      const functionToCall =
        toolsMap[tool_call.function.name as keyof typeof toolsMap];
      if (!functionToCall) {
        throw new Error(`Function not found: ${tool_call.function.name}`);
      }
      const result = functionToCall();

      // Adicionar a resposta da tool call
      messages.push({
        role: 'tool',
        tool_call_id: tool_call.id,
        content: JSON.stringify(result),
      });
    }

    // Fazer uma nova chamada com todas as respostas das tools
    const completionWithToolResult: OpenAI.Chat.Completions.ChatCompletion =
      await generateCompletion(
        messages,
        zodResponseFormat(schema, 'produtos_schema')
      );
    return completionWithToolResult;
  }

  return completion;
};

export const generateProducts = async (message: string) => {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'developer',
      content:
        'Liste no máximo três produtos que atendam a necessidade do usuário. Considere apenas os produtos em estoque.',
    },
    {
      role: 'user',
      content: message,
    },
  ];

  const completion = await generateCompletion(
    messages,
    zodResponseFormat(schema, 'produtos_schema')
  );

  return completion.choices[0].message.content;
};
