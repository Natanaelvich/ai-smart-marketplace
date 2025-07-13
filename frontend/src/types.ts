export type Product = {
    id: number;
    name: string;
    price: number;
    storeId: number;
    embedding: number[] | null;
    store: {
      id: number;
      name: string;
    }
  };