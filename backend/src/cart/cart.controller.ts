import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  userId = 1; // Simulating a logged-in user

  constructor(private readonly cartService: CartService) {}

  @Post()
  async addToCart(@Body() body: { productId: number; quantity: number }) {
    if (!body.productId || !body.quantity) {
      throw new BadRequestException('Product ID and quantity are required');
    }
    return this.cartService.addToCart(
      this.userId,
      body.productId,
      body.quantity,
    );
  }

  @Get()
  async getCart() {
    const cart = await this.cartService.getCart(this.userId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  @Put(':cartId/items/:productId')
  async updateCartItem(
    @Body() body: { quantity: number },
    @Param('productId') productId: string,
  ) {
    if (
      body.quantity === undefined ||
      body.quantity === null ||
      isNaN(body.quantity)
    ) {
      throw new BadRequestException('Quantity is required');
    }
    if (body.quantity < 0) {
      throw new BadRequestException('Quantity must be 0 or greater');
    }
    await this.cartService.updateCartItemQuantity(
      this.userId,
      Number(productId),
      body.quantity,
    );
  }

  @Delete()
  async clearAllCarts() {
    await this.cartService.clearAllCartsForUser(this.userId);
    return { ok: true };
  }
}
