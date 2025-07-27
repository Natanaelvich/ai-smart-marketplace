import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DatabaseService } from '../shared/database.service';
import { carts, cartItems, products, stores } from '../shared/schema';

@Injectable()
export class CartService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addToCart(userId: number, productId: number, quantity: number) {
    // Verificar se o produto existe e pegar a loja
    const product = await this.databaseService.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      throw new NotFoundException('Product not found');
    }

    const storeId = product[0].storeId;

    // Buscar ou criar carrinho ativo para o usuário nesta loja
    let cart = await this.databaseService.db
      .select()
      .from(carts)
      .where(
        and(
          eq(carts.userId, userId),
          eq(carts.storeId, storeId),
          eq(carts.active, true),
        ),
      )
      .limit(1);

    if (cart.length === 0) {
      // Criar novo carrinho
      const newCart = await this.databaseService.db
        .insert(carts)
        .values({
          userId,
          storeId,
          active: true,
        })
        .returning();
      cart = newCart;
    }

    const cartId = cart[0].id;

    // Verificar se o item já existe no carrinho
    const existingItem = await this.databaseService.db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
      )
      .limit(1);

    if (existingItem.length > 0) {
      // Atualizar quantidade do item existente
      await this.databaseService.db
        .update(cartItems)
        .set({ quantity: existingItem[0].quantity + quantity })
        .where(eq(cartItems.id, existingItem[0].id));

      return { id: existingItem[0].id, action: 'updated' };
    } else {
      // Adicionar novo item ao carrinho
      const newItem = await this.databaseService.db
        .insert(cartItems)
        .values({
          cartId,
          productId,
          quantity,
        })
        .returning();

      return { id: newItem[0].id, action: 'created' };
    }
  }

  async getCart(userId: number) {
    // Buscar carrinho ativo simples + nome da loja
    const cartWithStore = await this.databaseService.db
      .select({
        id: carts.id,
        userId: carts.userId,
        storeId: carts.storeId,
        active: carts.active,
        createdAt: carts.createdAt,
        store: {
          id: stores.id,
          name: stores.name,
        },
      })
      .from(carts)
      .leftJoin(stores, eq(carts.storeId, stores.id))
      .where(and(eq(carts.userId, userId), eq(carts.active, true)))
      .limit(1);

    if (cartWithStore.length === 0) {
      return null;
    }

    const cartData = cartWithStore[0];
    // Buscar itens do carrinho com dados completos do produto
    const items = await this.databaseService.db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        price: products.price,
        name: products.name,
        // Dados completos do produto
        product: {
          id: products.id,
          name: products.name,
          price: products.price,
        },
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cartData.id));

    // Calcular total
    const total = items.reduce(
      (acc, item) => acc + (item.product?.price ?? 0) * item.quantity,
      0,
    );

    return { ...cartData, items, total };
  }

  async updateCartItemQuantity(
    userId: number,
    productId: number,
    quantity: number,
  ) {
    // Buscar carrinho ativo do usuário
    const cart = await this.databaseService.db
      .select()
      .from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.active, true)))
      .limit(1);

    if (cart.length === 0) {
      throw new NotFoundException('Active cart not found');
    }

    const cartId = cart[0].id;

    // Buscar item do carrinho
    const item = await this.databaseService.db
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
      )
      .limit(1);

    if (item.length === 0) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity === 0) {
      // Remover item do carrinho
      await this.databaseService.db
        .delete(cartItems)
        .where(eq(cartItems.id, item[0].id));
      return { id: item[0].id, action: 'deleted' };
    } else {
      // Atualizar quantidade
      await this.databaseService.db
        .update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, item[0].id));
      return { id: item[0].id, action: 'updated' };
    }
  }

  async clearAllCartsForUser(userId: number) {
    // Busca todos os carrinhos do usuário
    const userCarts = await this.databaseService.db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId));

    const cartIds = userCarts.map((c) => c.id);

    if (cartIds.length > 0) {
      // Remove todos os itens desses carrinhos
      await this.databaseService.db
        .delete(cartItems)
        .where(inArray(cartItems.cartId, cartIds));
      // Remove os carrinhos
      await this.databaseService.db
        .delete(carts)
        .where(inArray(carts.id, cartIds));
    }
  }
}
