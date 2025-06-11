import express from 'express';
import {
  embedProducts,
  generateCart,
  generateEmbedding,
  generateProducts,
  createEmbeddingsBatch,
  createEmbeddingsBatchFile,
  processEmbeddingsBatchResult,
} from './openai';
import { setarEmbedding, todosProdutos } from './database';

const app = express();
app.use(express.json());

app.post('/generate', async (req, res) => {
  try {
    const products = await generateProducts(req.body.message);
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/cart', async (req, res) => {
  const { input } = req.body;

  const cart = await generateCart(
    input,
    todosProdutos().map(p => p.nome)
  );

  res.json(cart);
});

app.post('/embeddings', async (req, res) => {
  await embedProducts();
  console.log(todosProdutos());
  res.status(201).end();
});

app.post('/embedding', async (req, res) => {
  const { input } = req.body;
  await generateEmbedding(input);
  res.status(201).end();
});

app.post('/response', async (req, res) => {
  const { input } = req.body;

  const cart = await generateCart(input, ['feijão', 'detergente']);

  res.json(cart);
});

app.post('/embeddings-batch', async (req, res) => {
  const file = await createEmbeddingsBatchFile(
    todosProdutos().map(p => `${p.nome}: ${p.descricao}`)
  );
  const batch = await createEmbeddingsBatch(file.id);
  res.json(batch);
});

app.post('/embeddings-batch/result/:id', async (req, res) => {
  const result = await processEmbeddingsBatchResult(req.params.id);
  if (!result) {
    res.status(200).json({ message: 'Still processing' });
    return;
  }

  result.forEach(r => setarEmbedding(r.id, r.embeddings));

  res.status(201).end();
});

app.get('/products', async (req, res) => {
  res.json(
    todosProdutos().map(p => ({
      ...p,
      embedding: p.embedding ? p.embedding.slice(0, 3) : null,
    }))
  );
});

export default app;
