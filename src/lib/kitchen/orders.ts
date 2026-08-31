import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  assertAdminActor,
  type AdminActor,
} from '@/lib/admin/authorization';
import {
  ORDER_STATUS,
  ORDER_STATUSES,
  type OrderStatus,
} from '@/types';

export const KITCHEN_ACTIVE_STATUSES = [
  ORDER_STATUS.WAITING_WHATSAPP,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
] as const;

export const KITCHEN_RECENT_STATUSES = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
] as const;

const KITCHEN_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [ORDER_STATUS.DRAFT]: [],
  [ORDER_STATUS.WAITING_WHATSAPP]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

const ACTIVE_STATUS_PRIORITY = new Map<OrderStatus, number>(
  KITCHEN_ACTIVE_STATUSES.map((status, index) => [status, index]),
);

const KITCHEN_ORDER_SELECT = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  orderCode: true,
  total: true,
  status: true,
  fulfillmentType: true,
  paymentMethod: true,
  address: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { name: true, email: true } },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      unitPrice: true,
      quantity: true,
    },
    orderBy: { id: 'asc' },
  },
});

export type KitchenOrder = Prisma.OrderGetPayload<{ select: typeof KITCHEN_ORDER_SELECT }>;

export type KitchenOrderErrorCode =
  | 'INVALID_INPUT'
  | 'ORDER_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION';

export class KitchenOrderError extends Error {
  constructor(
    public readonly code: KitchenOrderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'KitchenOrderError';
  }
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new KitchenOrderError('INVALID_INPUT', `${field} debe ser un texto.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new KitchenOrderError('INVALID_INPUT', `${field} no es válido.`);
  }
  return normalized;
}

function parseOrderStatus(value: unknown, field: string): OrderStatus {
  const status = requiredString(value, field, 32);
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new KitchenOrderError('INVALID_INPUT', `${field} no es válido.`);
  }
  return status as OrderStatus;
}

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  return KITCHEN_TRANSITIONS[current].includes(next);
}

export function getNextKitchenStatuses(current: OrderStatus): readonly OrderStatus[] {
  return KITCHEN_TRANSITIONS[current];
}

export async function getKitchenOrders(
  statuses: readonly OrderStatus[] = KITCHEN_ACTIVE_STATUSES,
): Promise<KitchenOrder[]> {
  if (statuses.length === 0) return [];
  const orders = await prisma.order.findMany({
    where: { status: { in: [...statuses] } },
    select: KITCHEN_ORDER_SELECT,
    orderBy: { createdAt: 'asc' },
  });

  return orders.sort((left, right) => {
    const statusDelta = (ACTIVE_STATUS_PRIORITY.get(left.status as OrderStatus) ?? 99)
      - (ACTIVE_STATUS_PRIORITY.get(right.status as OrderStatus) ?? 99);
    return statusDelta || left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export async function getRecentKitchenOrders(limit = 12): Promise<KitchenOrder[]> {
  return prisma.order.findMany({
    where: { status: { in: [...KITCHEN_RECENT_STATUSES] } },
    select: KITCHEN_ORDER_SELECT,
    orderBy: { updatedAt: 'desc' },
    take: Math.max(1, Math.min(limit, 25)),
  });
}

export async function getKitchenBoard() {
  const [activeOrders, recentOrders] = await Promise.all([
    getKitchenOrders(),
    getRecentKitchenOrders(),
  ]);
  return { activeOrders, recentOrders };
}

export async function getKitchenOrder(orderId: string): Promise<KitchenOrder | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: KITCHEN_ORDER_SELECT,
  });
}

export async function transitionOrderStatusForKitchen(
  rawOrderId: unknown,
  rawExpectedStatus: unknown,
  rawNextStatus: unknown,
  actor: AdminActor,
) {
  assertAdminActor(actor);
  const orderId = requiredString(rawOrderId, 'El identificador del pedido', 191);
  const expectedStatus = parseOrderStatus(rawExpectedStatus, 'El estado actual');
  const nextStatus = parseOrderStatus(rawNextStatus, 'El estado siguiente');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) {
    throw new KitchenOrderError('ORDER_NOT_FOUND', 'El pedido no existe.');
  }
  if (order.status !== expectedStatus || !canTransitionOrderStatus(expectedStatus, nextStatus)) {
    throw new KitchenOrderError(
      'INVALID_STATUS_TRANSITION',
      'El pedido cambió o esa transición no está permitida. Actualiza la cocina e intenta nuevamente.',
    );
  }

  const result = await prisma.order.updateMany({
    where: { id: orderId, status: expectedStatus },
    data: { status: nextStatus },
  });
  if (result.count !== 1) {
    throw new KitchenOrderError(
      'INVALID_STATUS_TRANSITION',
      'Otro operador actualizó el pedido. La vista se refrescará con el estado vigente.',
    );
  }

  return { id: orderId, status: nextStatus };
}
