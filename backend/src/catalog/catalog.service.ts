import { Injectable } from '@nestjs/common';
import { eq, ilike, desc, asc, count, min, max, avg } from 'drizzle-orm';
import { DatabaseService } from '../shared/database.service';
import { products, stores } from '../shared/schema';

@Injectable()
export class CatalogService {
  constructor(private readonly databaseService: DatabaseService) {}

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
