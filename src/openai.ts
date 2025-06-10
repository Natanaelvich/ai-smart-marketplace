import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
import { z } from 'zod';
import {
  produtosEmEstoque,
  produtosEmFalta,
  setarEmbedding,
  todosProdutos,
} from './database';
import { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import { ReadStream } from 'fs';

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
  format: any
) => {
  const completion = await client.chat.completions.parse({
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
  if (tool_calls) {
    const [tool_call] = tool_calls;
    const toolsMap = {
      produtos_em_estoque: produtosEmEstoque,
      produtos_em_falta: produtosEmFalta,
    };
    const functionToCall =
      toolsMap[tool_call.function.name as keyof typeof toolsMap];
    if (!functionToCall) {
      throw new Error('Function not found');
    }
    const result = functionToCall();
    messages.push(completion.choices[0].message);
    messages.push({
      role: 'tool',
      tool_call_id: tool_call.id,
      content: result.toString(),
    });
    const completionWithToolResult = await generateCompletion(
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

  return completion.choices[0].message.parsed;
};

export const generateEmbedding = async (input: string) => {
  try {
    const response = await client.embeddings.create({
      input,
      model: 'text-embedding-3-small',
      encoding_format: 'float',
    });

    return response.data[0].embedding ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const embedProducts = async () => {
  const produtos = todosProdutos();

  await Promise.allSettled(
    produtos.map(async (p, index) => {
      const embedding = await generateEmbedding(`${p.nome}: ${p.descricao}`);
      if (!embedding) return;
      setarEmbedding(index, embedding);
    })
  );
};

const generateResponse = async (params: ResponseCreateParamsNonStreaming) => {
  const response = await client.responses.parse(params);

  if (response.output_parsed) return response.output_parsed;

  if (response.output_text) return response.output_text;

  return null;
};

export const generateCart = async (input: string, products: string[]) => {
  return generateResponse({
    model: 'gpt-4o-mini',
    instructions: `Retorne uma lista de até 5 produtos que satisfação a necessidade do usuário. Os produtos disponíveis são os seguintes: ${JSON.stringify(products)}`,
    input,
    text: {
      format: zodTextFormat(schema, 'carrinho'),
    },
    tools: [
      {
        type: 'file_search',
        vector_store_ids: ['vs_6813d154e3c88191ab8aacfc66052e7e'],
      },
    ],
  });
};

export const uploadFile = async (file: ReadStream) => {
  const uploaded = await client.files.create({
    file,
    purpose: 'assistants',
  });

  console.dir(uploaded, { depth: null });
};

export const createVector = async () => {
  const vectorStore = await client.vectorStores.create({
    name: 'node_ia_file_search_class',
    file_ids: ['file-2GMRzcyTDZp1HjxEx5pfd1'],
  });

  console.dir(vectorStore, { depth: null });
};

export const createEmbeddingsBatchFile = async (products: string[]) => {
  const content = products
    .map((p, i) => ({
      custom_id: i,
      method: 'POST',
      url: '/v1/embeddings',
      body: {
        input: p,
        model: 'text-embedding-3-small',
        encoding_format: 'float',
      },
    }))
    .map(p => JSON.stringify(p))
    .join('\n');

  const file = new File([content], 'embeddings-batch.jsonl');
  const uploaded = await client.files.create({
    file,
    purpose: 'batch',
  });

  return uploaded;
};

export const createEmbeddingsBatch = async (fileId: string) => {
  const batch = await client.batches.create({
    input_file_id: fileId,
    endpoint: '/v1/embeddings',
    completion_window: '24h',
  });

  return batch;
};
