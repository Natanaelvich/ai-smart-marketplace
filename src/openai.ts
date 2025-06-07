// Configuração das variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

// Importações da OpenAI SDK
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
import { z } from 'zod';
import { produtosEmEstoque, produtosEmFalta } from './database';

/**
 * RESPOSTA ESTRUTURADA (Structured Output)
 *
 * Definimos um schema Zod que força a IA a retornar dados em um formato específico.
 * Isso garante que sempre receberemos um objeto com a propriedade "produtos"
 * contendo um array de strings, eliminando a necessidade de parsing manual.
 */
const schema = z.object({
  produtos: z.array(z.string()),
});

// Inicialização do cliente OpenAI com a chave da API
const client = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

/**
 * TOOLS (Function Calling)
 *
 * As "tools" permitem que a IA chame funções específicas durante a conversa.
 * Isso é útil quando a IA precisa acessar dados externos ou executar ações.
 *
 * Cada tool tem:
 * - name: nome da função que a IA pode chamar
 * - description: explicação do que a função faz (ajuda a IA a decidir quando usar)
 * - parameters: schema dos parâmetros que a função aceita
 * - strict: true = força validação rigorosa dos parâmetros
 */
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'produtos_em_estoque',
      description: 'Lista os produtos que estão em estoque.',
      parameters: {
        type: 'object',
        properties: {}, // Nenhum parâmetro necessário
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
        properties: {}, // Nenhum parâmetro necessário
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

/**
 * FUNÇÃO PRINCIPAL DE CHAT
 *
 * Esta função gerencia a conversa com a IA, incluindo:
 * 1. Envio das mensagens para a API
 * 2. Processamento de chamadas de tools (se houver)
 * 3. Retorno da resposta final estruturada
 */
const generateCompletion = async (
  messages: ChatCompletionMessageParam[],
  format: ReturnType<typeof zodResponseFormat<typeof schema>>
): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
  // Primeira chamada para a API da OpenAI
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini', // Modelo mais econômico e rápido
    max_tokens: 100, // Limite de tokens na resposta
    response_format: format, // Força resposta estruturada (Zod schema)
    tools, // Disponibiliza as funções para a IA
    messages, // Histórico da conversa
  });

  // Verifica se a IA recusou responder (safety check)
  if (completion.choices[0].message.refusal) {
    throw new Error('Refusal');
  }

  /**
   * PROCESSAMENTO DE TOOL CALLS
   *
   * Se a IA decidiu chamar alguma função (tool), precisamos:
   * 1. Executar a função solicitada
   * 2. Adicionar o resultado ao histórico da conversa
   * 3. Fazer uma nova chamada para obter a resposta final
   */
  const { tool_calls } = completion.choices[0].message;
  if (tool_calls && tool_calls.length > 0) {
    // Mapeamento das funções disponíveis
    const toolsMap = {
      produtos_em_estoque: produtosEmEstoque,
      produtos_em_falta: produtosEmFalta,
    };

    // Adicionar a mensagem do assistente com as tool calls ao histórico
    messages.push(completion.choices[0].message);

    // Processar cada tool call solicitada pela IA
    for (const tool_call of tool_calls) {
      const functionToCall =
        toolsMap[tool_call.function.name as keyof typeof toolsMap];
      if (!functionToCall) {
        throw new Error(`Function not found: ${tool_call.function.name}`);
      }

      // Executar a função e obter o resultado
      const result = functionToCall();

      // Adicionar a resposta da tool call ao histórico
      // Isso é obrigatório: cada tool_call_id deve ter uma resposta
      messages.push({
        role: 'tool',
        tool_call_id: tool_call.id,
        content: JSON.stringify(result),
      });
    }

    // Segunda chamada: agora a IA tem os dados das tools e pode gerar a resposta final
    const completionWithToolResult: OpenAI.Chat.Completions.ChatCompletion =
      await generateCompletion(
        messages,
        zodResponseFormat(schema, 'produtos_schema')
      );
    return completionWithToolResult;
  }

  // Se não houve tool calls, retorna a resposta diretamente
  return completion;
};

/**
 * FUNÇÃO PÚBLICA DA API
 *
 * Esta é a função que será chamada pela nossa API REST.
 * Ela configura o contexto da conversa e chama a função principal.
 */
export const generateProducts = async (message: string) => {
  /**
   * ESTRUTURA DE MENSAGENS DO CHAT
   *
   * O array de mensagens representa o histórico da conversa:
   * - role: 'developer' = instruções do sistema (como a IA deve se comportar)
   * - role: 'user' = mensagem do usuário
   * - role: 'assistant' = resposta da IA
   * - role: 'tool' = resultado de uma função chamada
   */
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'developer', // Instrução do sistema
      content:
        'Liste no máximo três produtos que atendam a necessidade do usuário. Considere apenas os produtos em estoque.',
    },
    {
      role: 'user', // Mensagem do usuário
      content: message,
    },
  ];

  // Chama a função principal que gerencia todo o fluxo
  const completion = await generateCompletion(
    messages,
    zodResponseFormat(schema, 'produtos_schema') // Garante resposta estruturada
  );

  // Retorna apenas o conteúdo da resposta (já estruturado pelo schema)
  return completion.choices[0].message.content;
};
