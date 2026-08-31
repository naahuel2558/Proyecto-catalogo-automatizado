import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ORDER_STATUS, type OrderStatus } from '@/types';

const MAX_ITEMS = 50;
const MAX_QUANTITY_PER_PRODUCT = 99;
const ORDER_CODE_ATTEMPTS = 5;
const ROTISERIA_WHATSAPP_NUMBER = '5493585762463';

const ROOT_FIELDS = new Set([
  'items',
  'customerName',
  'customerPhone',
  'fulfillmentType',
  'address',
  'notes',
]);
const ITEM_FIELDS = new Set(['productId', 'quantity']);

export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export interface SecureCheckoutInput {
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  address?: string;
  notes?: string;
}

export interface SecureOrderDto {
  orderCode: string;
  total: number;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  paymentMethod: 'Efectivo';
  address: string | null;
  notes: string | null;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export type CheckoutErrorCode =
  | 'INVALID_INPUT'
  | 'EMPTY_CART'
  | 'INVALID_QUANTITY'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_UNAVAILABLE'
  | 'PRODUCT_ARCHIVED'
  | 'DATABASE_ERROR';

export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectUnknownFields(value: Record<string, unknown>, allowed: Set<string>, context: string) {
  const unknownField = Object.keys(value).find((key) => !allowed.has(key));
  if (unknownField) {
    throw new CheckoutError('INVALID_INPUT', `${context} contiene un campo no permitido: ${unknownField}.`);
  }
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new CheckoutError('INVALID_INPUT', `${field} debe ser un texto.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new CheckoutError('INVALID_INPUT', `${field} no es válido.`);
  }
  return normalized;
}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredString(value, field, maxLength);
}

export function parseCheckoutInput(value: unknown): SecureCheckoutInput {
  if (!isRecord(value)) {
    throw new CheckoutError('INVALID_INPUT', 'El pedido no tiene un formato válido.');
  }
  rejectUnknownFields(value, ROOT_FIELDS, 'El pedido');

  if (!Array.isArray(value.items)) {
    throw new CheckoutError('INVALID_INPUT', 'El carrito debe ser una lista.');
  }
  if (value.items.length === 0) {
    throw new CheckoutError('EMPTY_CART', 'El carrito está vacío.');
  }
  if (value.items.length > MAX_ITEMS) {
    throw new CheckoutError('INVALID_INPUT', 'El carrito tiene demasiados productos.');
  }

  const normalizedItems = new Map<string, number>();
  for (const rawItem of value.items) {
    if (!isRecord(rawItem)) {
      throw new CheckoutError('INVALID_INPUT', 'Uno de los productos no tiene un formato válido.');
    }
    rejectUnknownFields(rawItem, ITEM_FIELDS, 'Un producto');

    const productId = requiredString(rawItem.productId, 'productId', 191);
    const quantity = rawItem.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
      throw new CheckoutError('INVALID_QUANTITY', 'La cantidad debe ser un entero mayor que cero.');
    }

    const combinedQuantity = (normalizedItems.get(productId) ?? 0) + (quantity as number);
    if (combinedQuantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new CheckoutError('INVALID_QUANTITY', `La cantidad de ${productId} supera el máximo permitido.`);
    }
    normalizedItems.set(productId, combinedQuantity);
  }

  const customerName = requiredString(value.customerName, 'customerName', 100);
  const customerPhone = requiredString(value.customerPhone, 'customerPhone', 32);
  if (!/^\+?[0-9\s()-]{8,32}$/.test(customerPhone)) {
    throw new CheckoutError('INVALID_INPUT', 'El celular no tiene un formato válido.');
  }

  if (value.fulfillmentType !== 'DELIVERY' && value.fulfillmentType !== 'PICKUP') {
    throw new CheckoutError('INVALID_INPUT', 'El tipo de entrega no es válido.');
  }

  const address = optionalString(value.address, 'address', 300);
  if (value.fulfillmentType === 'DELIVERY' && !address) {
    throw new CheckoutError('INVALID_INPUT', 'La dirección es obligatoria para delivery.');
  }

  return {
    items: Array.from(normalizedItems, ([productId, quantity]) => ({ productId, quantity })),
    customerName,
    customerPhone,
    fulfillmentType: value.fulfillmentType,
    address: value.fulfillmentType === 'DELIVERY' ? address : undefined,
    notes: optionalString(value.notes, 'notes', 500),
  };
}

export function parseReceiptRequest(value: unknown): Pick<SecureCheckoutInput, 'customerName' | 'customerPhone'> & { orderCode: string } {
  if (!isRecord(value)) {
    throw new CheckoutError('INVALID_INPUT', 'La solicitud no tiene un formato válido.');
  }
  rejectUnknownFields(value, new Set(['orderCode', 'customerName', 'customerPhone']), 'La solicitud');

  const orderCode = requiredString(value.orderCode, 'orderCode', 32);
  if (!/^EP-[A-F0-9]{10}$/.test(orderCode)) {
    throw new CheckoutError('INVALID_INPUT', 'El código de pedido no es válido.');
  }

  const customerName = requiredString(value.customerName, 'customerName', 100);
  const customerPhone = requiredString(value.customerPhone, 'customerPhone', 32);
  if (!/^\+?[0-9\s()-]{8,32}$/.test(customerPhone)) {
    throw new CheckoutError('INVALID_INPUT', 'El celular no tiene un formato válido.');
  }

  return { orderCode, customerName, customerPhone };
}

function generateOrderCode(): string {
  return `EP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function createSecureOrder(rawInput: unknown, userId: string | null): Promise<{
  order: SecureOrderDto;
  customerName: string;
  customerPhone: string;
  whatsappUrl: string;
}> {
  const input = parseCheckoutInput(rawInput);

  for (let attempt = 1; attempt <= ORDER_CODE_ATTEMPTS; attempt += 1) {
    const orderCode = generateOrderCode();

    try {
      const order = await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
          where: { id: { in: input.items.map((item) => item.productId) } },
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            isArchived: true,
          },
        });
        const productsById = new Map(products.map((product) => [product.id, product]));

        const orderItems = input.items.map((item) => {
          const product = productsById.get(item.productId);
          if (!product) {
            throw new CheckoutError('PRODUCT_NOT_FOUND', `El producto ${item.productId} no existe.`);
          }
          if (product.isArchived) {
            throw new CheckoutError('PRODUCT_ARCHIVED', `${product.name} ya no forma parte del catálogo.`);
          }
          if (!product.isAvailable) {
            throw new CheckoutError('PRODUCT_UNAVAILABLE', `${product.name} no está disponible.`);
          }
          if (!Number.isSafeInteger(product.price) || product.price < 0) {
            throw new Error(`Invalid database price for product ${product.id}`);
          }

          return {
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: item.quantity,
          };
        });

        const total = orderItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
        if (!Number.isSafeInteger(total)) {
          throw new Error('Calculated order total exceeds the safe integer range');
        }

        return tx.order.create({
          data: {
            orderCode,
            userId,
            total,
            status: ORDER_STATUS.WAITING_WHATSAPP,
            fulfillmentType: input.fulfillmentType,
            paymentMethod: 'Efectivo',
            address: input.address ?? null,
            notes: input.notes ?? null,
            whatsappConfirmedAt: null,
            items: { create: orderItems },
          },
          select: {
            orderCode: true,
            total: true,
            status: true,
            fulfillmentType: true,
            paymentMethod: true,
            address: true,
            notes: true,
            createdAt: true,
            items: {
              select: {
                productId: true,
                productName: true,
                unitPrice: true,
                quantity: true,
              },
            },
          },
        });
      });

      const dto: SecureOrderDto = {
        orderCode: order.orderCode,
        total: order.total,
        status: order.status as OrderStatus,
        fulfillmentType: order.fulfillmentType as FulfillmentType,
        paymentMethod: 'Efectivo',
        address: order.address,
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          productId: item.productId as string,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      };
      const receiptText = buildReceiptText(dto, input.customerName, input.customerPhone);

      return {
        order: dto,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        whatsappUrl: `https://wa.me/${ROTISERIA_WHATSAPP_NUMBER}?text=${encodeURIComponent(receiptText)}`,
      };
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < ORDER_CODE_ATTEMPTS) continue;
      throw error;
    }
  }

  throw new CheckoutError('DATABASE_ERROR', 'No se pudo generar un código de pedido único.');
}

export function buildReceiptText(
  order: SecureOrderDto,
  customerName: string,
  customerPhone: string,
): string {
  const createdAt = new Date(order.createdAt);
  const date = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(createdAt);
  const items = order.items.map((item) => `${item.quantity}x _${item.productName}_`).join('\n');
  const delivery = order.fulfillmentType === 'DELIVERY'
    ? `_Envío a domicilio_\n\n_Dirección / Detalles de envío:_\n${order.address}`
    : '_Retira en el local_';
  const notes = order.notes ? `\n\n_Detalles del pedido:_\n${order.notes}` : '';

  return `_Entre Panes - Recibo de Pedido_\n\n_Código de pedido:_\n${order.orderCode}\n\n_Nombre:_\n${customerName}\n\n_Celular del cliente:_\n${customerPhone}\n\n${delivery}${notes}\n\n_Fecha y Hora:_\n${date}\n\n${items}\n\n_Valor Total:_\n$${order.total.toLocaleString('es-AR')}`;
}

export async function getReceiptOrder(orderCode: string): Promise<SecureOrderDto | null> {
  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: {
      orderCode: true,
      total: true,
      status: true,
      fulfillmentType: true,
      paymentMethod: true,
      address: true,
      notes: true,
      createdAt: true,
      items: {
        select: {
          productId: true,
          productName: true,
          unitPrice: true,
          quantity: true,
        },
      },
    },
  });

  if (!order || !order.fulfillmentType) return null;
  return {
    orderCode: order.orderCode,
    total: order.total,
    status: order.status as OrderStatus,
    fulfillmentType: order.fulfillmentType as FulfillmentType,
    paymentMethod: 'Efectivo',
    address: order.address,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId ?? '',
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
  };
}
