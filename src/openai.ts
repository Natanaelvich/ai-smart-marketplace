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

const generateResponse = async <T = null>(
  params: ResponseCreateParamsNonStreaming
) => {
  const response = await client.responses.parse(params);
  if (response.output_parsed) return response.output_parsed as T;

  return null;
};

const createCartPromptChunks = (input: string, products: string[]) => {
  const chunkSize = 10;
  const chunks: string[] = [];

  for (let i = 0; i < chunkSize; i += chunkSize) {
    chunks.push(
      `Retorne uma lista de até 5 produtos que satisfação a necessidade do usuário.
  
        1. Divida o prato em components principais.
        2. Para cada componente, forneça uma lista de produtos que podem ser usados para prepará-lo.
        3. Liste todos os produtos necessários para todos os componentes.
  
        -------------------
        Exemplo:
        - Produtos disponíveis: Farinha de trigo, Açúcar, Manteiga, Sal, Limão, Ovos, Creme de leite, Morango, Chocolate, Leite condensado, Biscoito, Gelatina
        - Necessidade do usuário: Torta de Limão
  
        1. Divida o prato em components principais.
          - Massa, recheio, Cobertura
        2. Para cada componente, forneça uma lista de produtos que podem ser usados para prepará-lo.
          - Massa: farinha de trigo, açúcar, manteiga, Sal
          - Recheio: limão, açúcar, ovos
          - Cobertura: creme de leite, açúcar
        3. Liste todos os produtos necessários para todos os componentes.
          - Farinha de trigo, açúcar, manteiga, sal, limão, ovos, creme de leite
        -------------------
  
  
        Os produtos disponíveis são os seguintes: ${JSON.stringify(
          products.slice(i, i + chunkSize)
        )}`
    );
  }

  return chunks;
};

export const generateCart = async (input: string, products: string[]) => {
  const promises = createCartPromptChunks(input, products).map(chunk => {
    return generateResponse<{
      produtos: string[];
    }>({
      model: 'gpt-4o-mini',
      instructions: chunk,
      input,
      text: {
        format: zodTextFormat(schema, 'carrinho'),
      },
    });
  });

  const results = await Promise.all(promises);

  return results
    .filter((r): r is { produtos: string[] } => Boolean(r))
    .flatMap(r => r.produtos);
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
      custom_id: String(i),
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

export const getBatch = async (id: string) => {
  return await client.batches.retrieve(id);
};

export const getFileContent = async (id: string) => {
  const response = await client.files.content(id);

  return response.text();
};

export const processEmbeddingsBatchResult = async (batchId: string) => {
  const batch = await getBatch(batchId);
  if (batch.status !== 'completed' || !batch.output_file_id) {
    return null;
  }

  const content = await getFileContent(batch.output_file_id);
  return content
    .split('\n')
    .map(line => {
      try {
        const parsed = JSON.parse(line) as {
          custom_id: string;
          response: { body: { data: { embedding: number[] }[] } };
        };
        return {
          id: Number(parsed.custom_id),
          embeddings: parsed.response.body.data[0].embedding,
        };
      } catch (e) {
        console.error(e);
        return null;
      }
    })
    .filter((r): r is { id: number; embeddings: number[] } => Boolean(r));
};
