export type OrderStatus = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'MercadoPago';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'lomos' | 'milanesas' | 'hamburguesas' | 'combos' | 'papas';
  image?: string;
  badge?: string;
  available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string; // e.g. "206521"
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryNotes?: string;
  isPickup: boolean;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string; // ISO date string or formatted
}
