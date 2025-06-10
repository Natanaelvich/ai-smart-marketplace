import express from 'express';
import {
  embedProducts,
  generateCart,
  generateEmbedding,
  generateProducts,
  createEmbeddingsBatch,
  createEmbeddingsBatchFile,
  getBatch,
  getFileContent,
  processEmbeddingsBatchResult,
} from './openai';
import { produtosSimilares, setarEmbedding, todosProdutos } from './database';

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
  const { message } = req.body;
  const embedding = await generateEmbedding(message);
  if (!embedding) {
    res.status(500).json({ error: 'Embedding não gerada' });
    return;
  }
  const produtos = produtosSimilares(embedding);
  res.json(produtos.map(p => ({ nome: p.nome, similaridade: p.similaridade })));
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
  const file = await createEmbeddingsBatchFile(['sorvete', 'alface']);
  const batch = await createEmbeddingsBatch(file.id);
  res.json(batch);
});

app.post('/embeddings-batch/result', async (req, res) => {
    const result = await processEmbeddingsBatchResult('batch_681cef110b348190ac52d60760584d26');Add commentMore actions
    if (!result){
      res.status(200).json({ message: 'Still processing' });
      return
  
    }
  
    result.forEach(r => setarEmbedding(r.id, r.embeddings))
  
    res.status(201).end();
});

app.get('/products', async (req, res) => {
    res.json(todosProdutos().map(p => ({
      ...p,
      embedding: p.embedding ? p.embedding.slice(0, 3) : null
    })));
  });

export default app;
