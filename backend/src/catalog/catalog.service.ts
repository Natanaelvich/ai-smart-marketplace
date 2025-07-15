import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  eq,
  isNull,
  ilike,
  desc,
  asc,
  count,
  min,
  max,
  avg,
} from 'drizzle-orm';
import { DatabaseService } from '../shared/database.service';
import { LlmService } from '../shared/llm.service';
import { ConfigService } from '@nestjs/config';
import { products, stores } from '../shared/schema';

@Injectable()
export class CatalogService implements OnApplicationBootstrap {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }
    // Find products with null embedding
    const productsToEmbed = await this.databaseService.db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(isNull(products.embedding));
    if (productsToEmbed.length === 0) {
      console.log('No products to embed');
      return;
    }
    await this.llmService.batchEmbedProducts(productsToEmbed);
  }

  async handleEmbeddingWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ) {
    console.log('CatalogService.handleEmbeddingWebhook called');
    const results = await this.llmService.handleWebhookEvent(rawBody, headers);
    if (!results || results.length === 0) {
      console.log('No results from handleWebhookEvent');
      return;
    }
    for (const result of results) {
      const { productId, embedding } = result;
      await this.databaseService.db
        .update(products)
        .set({ embedding })
        .where(eq(products.id, Number(productId)));
      console.log(`Updated product ${productId} with new embedding`);
    }
  }

  async getCatalog(search = '') {
    const query = this.databaseService.db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        embedding: products.embedding,
        store: {
          id: stores.id,
          name: stores.name,
        },
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id));

    if (search) {
      return await query.where(ilike(products.name, `%${search}%`));
    }

    return await query;
  }

  // Exemplo de query mais complexa com agregações - benefício do Drizzle
  async getProductStats() {
    return await this.databaseService.db
      .select({
        store: {
          id: stores.id,
          name: stores.name,
        },
        totalProducts: count(products.id),
        minPrice: min(products.price),
        maxPrice: max(products.price),
        avgPrice: avg(products.price),
      })
      .from(stores)
      .leftJoin(products, eq(stores.id, products.storeId))
      .groupBy(stores.id, stores.name)
      .orderBy(desc(count(products.id)));
  }

  // Exemplo de query com ordenação type-safe
  async getProductsByPrice(ascending = true) {
    const orderFn = ascending ? asc : desc;

    return await this.databaseService.db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        store: {
          id: stores.id,
          name: stores.name,
        },
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .orderBy(orderFn(products.price));
  }
}
