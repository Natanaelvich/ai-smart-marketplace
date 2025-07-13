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
});
