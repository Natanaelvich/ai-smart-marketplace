/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Cart (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should add a product to the cart', async () => {
    const response = await request(app.getHttpServer()).post('/cart').send({
      productId: 37, // Using existing product ID
      quantity: 2,
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should get cart after adding product', async () => {
    // User ID 1 already has an active cart from seeds, so this should return existing cart
    const responseCart = await request(app.getHttpServer()).get('/cart');
    expect(responseCart.status).toBe(200);
    expect(responseCart.body).toHaveProperty('id');
    expect(responseCart.body).toHaveProperty('userId');
    expect(responseCart.body.active).toBe(true);
  });

  it('should return 404 when product does not exist', async () => {
    const response = await request(app.getHttpServer()).post('/cart').send({
      productId: 99999, // Non-existent product
      quantity: 2,
    });
    expect(response.status).toBe(404);
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await request(app.getHttpServer()).post('/cart').send({
      productId: 37,
      // quantity missing
    });
    expect(response.status).toBe(400);
  });

  it('should remove a product from the cart if quantity is 0', async () => {
    // Limpa todos os carrinhos do usuário após o app estar pronto
    await request(app.getHttpServer()).delete('/cart');
    // Buscar um produto existente via catálogo
    const catalogRes = await request(app.getHttpServer()).get('/catalog');
    expect(catalogRes.status).toBe(200);
    expect(Array.isArray(catalogRes.body)).toBe(true);
    type Product = {
      id: number;
      name: string;
      price: number;
      store: { id: number; name: string };
    };
    const products = catalogRes.body as Product[];
    const product = products[0];
    expect(product).toHaveProperty('id');

    // Adicionar o produto ao carrinho
    const response = await request(app.getHttpServer()).post('/cart').send({
      productId: product.id,
      quantity: 2,
    });
    expect(response.status).toBe(201);
    type CartResponse = { id: number };
    const cartResponse = (await request(app.getHttpServer()).get('/cart'))
      .body as CartResponse;
    expect(cartResponse).toHaveProperty('id');

    // Atualiza quantidade para 0 (remoção)
    const response2 = await request(app.getHttpServer())
      .put(`/cart/${cartResponse.id}/items/${product.id}`)
      .send({ quantity: 0 });
    expect(response2.status).toBe(200);

    const responseCart = await request(app.getHttpServer()).get('/cart/');
    expect(responseCart.status).toBe(200);
    type CartGetResponse = { id: number; items: unknown[] };
    const cartGetResponse = responseCart.body as CartGetResponse;
    expect(cartGetResponse.id).toBe(cartResponse.id);
    expect(cartGetResponse.items.length).toBe(0);
  });
});
