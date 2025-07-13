import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { stores, products } from './schema';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

const db = drizzle(pool);

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    // Limpar dados existentes (opcional - para desenvolvimento)
    await db.delete(products);
    await db.delete(stores);

    // Inserir lojas
    console.log('📦 Seeding stores...');
    const insertedStores = await db
      .insert(stores)
      .values([
        { name: 'Supermercado Central' },
        { name: 'Mercado Econômico' },
        { name: 'SuperShop Express' },
      ])
      .returning();

    console.log(`✅ Inserted ${insertedStores.length} stores`);

    // Inserir produtos
    console.log('🛒 Seeding products...');
    const productsData = [
      // Supermercado Central (Loja 1)
      { name: 'Feijão preto - 1kg', price: 799, storeId: insertedStores[0].id },
      { name: 'Arroz branco - 1kg', price: 599, storeId: insertedStores[0].id },
      {
        name: 'Farinha de mandioca - 500g',
        price: 425,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Linguiça calabresa - 500g',
        price: 1190,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Costelinha suína - 1kg',
        price: 1890,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Macarrão espaguete - 500g',
        price: 399,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Peito de frango - 1kg',
        price: 1290,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Creme de leite - 200g',
        price: 299,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Queijo mussarela - 200g',
        price: 690,
        storeId: insertedStores[0].id,
      },
      { name: 'Cenoura - 1kg', price: 449, storeId: insertedStores[0].id },
      { name: 'Ovos - dúzia', price: 999, storeId: insertedStores[0].id },
      {
        name: 'Açúcar refinado - 1kg',
        price: 549,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Chocolate em pó - 200g',
        price: 679,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Fermento químico - 100g',
        price: 299,
        storeId: insertedStores[0].id,
      },
      {
        name: 'Óleo de soja - 900ml',
        price: 649,
        storeId: insertedStores[0].id,
      },

      // Mercado Econômico (Loja 2)
      { name: 'Feijão preto - 1kg', price: 749, storeId: insertedStores[1].id },
      { name: 'Arroz branco - 1kg', price: 579, storeId: insertedStores[1].id },
      {
        name: 'Linguiça calabresa - 500g',
        price: 1090,
        storeId: insertedStores[1].id,
      },
      {
        name: 'Costelinha suína - 1kg',
        price: 1790,
        storeId: insertedStores[1].id,
      },
      {
        name: 'Macarrão espaguete - 500g',
        price: 419,
        storeId: insertedStores[1].id,
      },
      {
        name: 'Peito de frango - 1kg',
        price: 1240,
        storeId: insertedStores[1].id,
      },
      {
        name: 'Creme de leite - 200g',
        price: 289,
        storeId: insertedStores[1].id,
      },
      { name: 'Cenoura - 1kg', price: 429, storeId: insertedStores[1].id },
      { name: 'Ovos - dúzia', price: 959, storeId: insertedStores[1].id },
      {
        name: 'Chocolate em pó - 200g',
        price: 659,
        storeId: insertedStores[1].id,
      },
      {
        name: 'Fermento químico - 100g',
        price: 289,
        storeId: insertedStores[1].id,
      },

      // SuperShop Express (Loja 3)
      {
        name: 'Farinha de mandioca - 500g',
        price: 399,
        storeId: insertedStores[2].id,
      },
      {
        name: 'Linguiça calabresa - 500g',
        price: 1150,
        storeId: insertedStores[2].id,
      },
      {
        name: 'Peito de frango - 1kg',
        price: 1350,
        storeId: insertedStores[2].id,
      },
      {
        name: 'Creme de leite - 200g',
        price: 319,
        storeId: insertedStores[2].id,
      },
      {
        name: 'Queijo mussarela - 200g',
        price: 729,
        storeId: insertedStores[2].id,
      },
      { name: 'Cenoura - 1kg', price: 469, storeId: insertedStores[2].id },
      { name: 'Ovos - dúzia', price: 1020, storeId: insertedStores[2].id },
      {
        name: 'Açúcar refinado - 1kg',
        price: 569,
        storeId: insertedStores[2].id,
      },
      {
        name: 'Chocolate em pó - 200g',
        price: 699,
        storeId: insertedStores[2].id,
      },
      {
        name: 'Fermento químico - 100g',
        price: 319,
        storeId: insertedStores[2].id,
      },
    ];

    const insertedProducts = await db
      .insert(products)
      .values(productsData)
      .returning();

    console.log(`✅ Inserted ${insertedProducts.length} products`);
    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { seed };
