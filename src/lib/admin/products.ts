import { prisma } from '@/lib/db';
import {
  assertAdminActor,
  type AdminActor,
} from '@/lib/admin/authorization';

const PRODUCT_FIELDS = new Set([
  'name',
  'description',
  'price',
  'image',
  'categoryId',
  'isAvailable',
  'isFeatured',
]);
const MAX_PRICE = 100_000_000;

export type ProductAdminErrorCode =
  | 'INVALID_INPUT'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_ARCHIVED'
  | 'PRODUCT_NOT_FOUND';

export class ProductAdminError extends Error {
  constructor(
    public readonly code: ProductAdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProductAdminError';
  }
}

export interface ProductAdminInput {
  name: string;
  description: string;
  price: number;
  image: string | null;
  categoryId: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ProductAdminError('INVALID_INPUT', `${field} debe ser un texto.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new ProductAdminError('INVALID_INPUT', `${field} no es válido.`);
  }
  return normalized;
}

function descriptionString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length > 1_000) {
    throw new ProductAdminError('INVALID_INPUT', 'La descripción no es válida.');
  }
  return value.trim();
}

function parsePrice(value: unknown): number {
  let price: number;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new ProductAdminError('INVALID_INPUT', 'El precio debe ser un número entero.');
    }
    price = Number(normalized);
  } else if (typeof value === 'number') {
    price = value;
  } else {
    throw new ProductAdminError('INVALID_INPUT', 'El precio debe ser un número entero.');
  }

  if (!Number.isSafeInteger(price) || price <= 0 || price > MAX_PRICE) {
    throw new ProductAdminError(
      'INVALID_INPUT',
      `El precio debe ser un entero positivo de hasta $${MAX_PRICE.toLocaleString('es-AR')}.`,
    );
  }
  return price;
}

function parseImage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ProductAdminError('INVALID_INPUT', 'La imagen debe ser una URL o ruta válida.');
  }
  const image = value.trim();
  if (!image || image.length > 500) {
    throw new ProductAdminError('INVALID_INPUT', 'La imagen debe ser una URL o ruta válida.');
  }
  if (image.startsWith('/')) return image;

  try {
    const url = new URL(image);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid protocol');
    return url.toString();
  } catch {
    throw new ProductAdminError(
      'INVALID_INPUT',
      'La imagen debe comenzar con / o ser una URL http/https.',
    );
  }
}

export function parseProductAdminInput(value: unknown): ProductAdminInput {
  if (!isRecord(value)) {
    throw new ProductAdminError('INVALID_INPUT', 'Los datos del producto no son válidos.');
  }
  const unknownField = Object.keys(value).find((key) => !PRODUCT_FIELDS.has(key));
  if (unknownField) {
    throw new ProductAdminError('INVALID_INPUT', `Campo no permitido: ${unknownField}.`);
  }
  if (typeof value.isAvailable !== 'boolean' || typeof value.isFeatured !== 'boolean') {
    throw new ProductAdminError('INVALID_INPUT', 'Los estados del producto deben ser booleanos.');
  }

  return {
    name: requiredString(value.name, 'El nombre', 120),
    description: descriptionString(value.description),
    price: parsePrice(value.price),
    image: parseImage(value.image),
    categoryId: requiredString(value.categoryId, 'La categoría', 191),
    isAvailable: value.isAvailable,
    isFeatured: value.isFeatured,
  };
}

function parseProductId(value: unknown): string {
  return requiredString(value, 'El identificador del producto', 191);
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ProductAdminError('INVALID_INPUT', `${field} debe ser verdadero o falso.`);
  }
  return value;
}

async function requireActiveCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, isArchived: true },
  });
  if (!category) {
    throw new ProductAdminError('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe.');
  }
  if (category.isArchived) {
    throw new ProductAdminError('CATEGORY_ARCHIVED', 'La categoría seleccionada está archivada.');
  }
  return category;
}

async function requireProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new ProductAdminError('PRODUCT_NOT_FOUND', 'El producto no existe.');
  }
  return product;
}

export async function createProductForAdmin(rawInput: unknown, actor: AdminActor) {
  assertAdminActor(actor);
  const input = parseProductAdminInput(rawInput);
  await requireActiveCategory(input.categoryId);

  return prisma.product.create({
    data: {
      ...input,
      isArchived: false,
    },
    select: { id: true },
  });
}

export async function updateProductForAdmin(
  rawProductId: unknown,
  rawInput: unknown,
  actor: AdminActor,
) {
  assertAdminActor(actor);
  const productId = parseProductId(rawProductId);
  const input = parseProductAdminInput(rawInput);
  await Promise.all([requireProduct(productId), requireActiveCategory(input.categoryId)]);

  return prisma.product.update({
    where: { id: productId },
    data: input,
    select: { id: true },
  });
}

export async function setProductAvailabilityForAdmin(
  rawProductId: unknown,
  rawValue: unknown,
  actor: AdminActor,
) {
  assertAdminActor(actor);
  const productId = parseProductId(rawProductId);
  const isAvailable = parseBoolean(rawValue, 'La disponibilidad');
  await requireProduct(productId);
  return prisma.product.update({
    where: { id: productId },
    data: { isAvailable },
    select: { id: true },
  });
}

export async function setProductFeaturedForAdmin(
  rawProductId: unknown,
  rawValue: unknown,
  actor: AdminActor,
) {
  assertAdminActor(actor);
  const productId = parseProductId(rawProductId);
  const isFeatured = parseBoolean(rawValue, 'El estado destacado');
  await requireProduct(productId);
  return prisma.product.update({
    where: { id: productId },
    data: { isFeatured },
    select: { id: true },
  });
}

export async function archiveProductForAdmin(rawProductId: unknown, actor: AdminActor) {
  assertAdminActor(actor);
  const productId = parseProductId(rawProductId);
  await requireProduct(productId);
  return prisma.product.update({
    where: { id: productId },
    data: { isArchived: true },
    select: { id: true },
  });
}

export async function restoreProductForAdmin(rawProductId: unknown, actor: AdminActor) {
  assertAdminActor(actor);
  const productId = parseProductId(rawProductId);
  await requireProduct(productId);
  return prisma.product.update({
    where: { id: productId },
    data: { isArchived: false },
    select: { id: true },
  });
}

export async function getAdminProduct(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });
}

export async function getAdminCategories() {
  return prisma.category.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });
}

export async function getAdminCategoryFilters() {
  return prisma.category.findMany({
    select: { id: true, name: true, isArchived: true },
    orderBy: { name: 'asc' },
  });
}

export interface ProductAdminFilters {
  search?: string;
  categoryId?: string;
  availability?: 'available' | 'unavailable';
  archive?: 'active' | 'archived' | 'all';
}

export async function getAdminProducts(filters: ProductAdminFilters = {}) {
  const search = filters.search?.trim().slice(0, 120);
  return prisma.product.findMany({
    where: {
      ...(search ? { name: { contains: search } } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.availability === 'available' ? { isAvailable: true } : {}),
      ...(filters.availability === 'unavailable' ? { isAvailable: false } : {}),
      ...(filters.archive === 'archived' ? { isArchived: true } : {}),
      ...(filters.archive === 'active' || !filters.archive ? { isArchived: false } : {}),
    },
    include: { category: true },
    orderBy: [{ isArchived: 'asc' }, { updatedAt: 'desc' }, { name: 'asc' }],
  });
}
