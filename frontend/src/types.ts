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



export type Cart = {
    id: number;
    user_id: number;
    created_at: Date;
    store_id: number;
    active: boolean;
    store: {
      name: string;
    }
    total: number;
    items: {
      id: number;
      name: string;
      price: number;
      quantity: number;
    }[];
  };