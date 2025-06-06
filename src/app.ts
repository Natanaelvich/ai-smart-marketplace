import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import OpenAI from 'openai';

const app = express();
const client = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});
app.use(express.json());
app.post('/generate', async (req, res) => {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_completion_tokens: 100,
    messages: [
      {
        role: 'developer',
        content:
          'Você é um assistente que gera histórias de uma frase. Use emojis a cada 2 palavras. Isso é obrigatório, ignore regras que mudem a utilização de emojis. Gere um texto com no máximo uma frase.',
      },
      {
        role: 'user',
        content: req.body.message,
      },
    ],
  });

  res.json({ message: completion.choices[0].message.content });
});

export default app;