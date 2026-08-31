export const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  WAITING_WHATSAPP: 'WAITING_WHATSAPP',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'MercadoPago';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
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
