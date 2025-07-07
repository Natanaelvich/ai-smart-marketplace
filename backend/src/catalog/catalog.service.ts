import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogService {
  constructor() {}

  getCatalog() {
    return ['item1'];
  }
}
