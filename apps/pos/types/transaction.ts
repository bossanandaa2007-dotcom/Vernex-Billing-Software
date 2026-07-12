  export interface ProductStock {
    name: string;
    cat: string;
    stock?: number;
  }
  
  export interface Product {
    sellprice: number;
    productstock: ProductStock;
  }
  
  export interface TransactionData {
    id: string;
    productId: string;
    quantity: number;
    transactionId: string;
    productName?: string;
    unitPrice?: number;
    product: Product;
  }
  
