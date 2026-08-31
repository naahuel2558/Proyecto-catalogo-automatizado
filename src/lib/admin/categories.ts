import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  assertAdminActor,
  type AdminActor,
} from '@/lib/admin/authorization';

const CATEGORY_FIELDS = new Set(['name']);
const MAX_CATEGORY_NAME_LENGTH = 120;

export type CategoryAdminErrorCode =
  | 'INVALID_INPUT'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_ALREADY_EXISTS';

export class CategoryAdminError extends Error {
  constructor(
    public readonly code: CategoryAdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CategoryAdminError';
  }
}

export interface CategoryAdminInput {
  name: string;
}

export interface CategoryAdminFilters {
  search?: string;
  archive?: 'active' | 'archived' | 'all';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new CategoryAdminError('INVALID_INPUT', `${field} debe ser un texto.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new CategoryAdminError('INVALID_INPUT', `${field} no es válido.`);
  }
  return normalized;
}

export function categorySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseCategoryAdminInput(value: unknown): CategoryAdminInput {
  if (!isRecord(value)) {
    throw new CategoryAdminError('INVALID_INPUT', 'Los datos de la categoría no son válidos.');
  }
  const unknownField = Object.keys(value).find((key) => !CATEGORY_FIELDS.has(key));
  if (unknownField) {
    throw new CategoryAdminError('INVALID_INPUT', `Campo no permitido: ${unknownField}.`);
  }

  const name = requiredString(value.name, 'El nombre', MAX_CATEGORY_NAME_LENGTH);
  if (!categorySlug(name)) {
    throw new CategoryAdminError('INVALID_INPUT', 'El nombre debe contener letras o números.');
  }
  return { name };
}

function parseCategoryId(value: unknown): string {
  return requiredString(value, 'El identificador de la categoría', 191);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function requireCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new CategoryAdminError('CATEGORY_NOT_FOUND', 'La categoría no existe.');
  }
  return category;
}

async function rejectDuplicate(name: string, categoryId?: string) {
  const duplicate = await prisma.category.findFirst({
    where: {
      slug: categorySlug(name),
      ...(categoryId ? { id: { not: categoryId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new CategoryAdminError('CATEGORY_ALREADY_EXISTS', 'Ya existe una categoría con ese nombre.');
  }
}

export async function createCategoryForAdmin(rawInput: unknown, actor: AdminActor) {
  assertAdminActor(actor);
  const input = parseCategoryAdminInput(rawInput);
  const slug = categorySlug(input.name);
  await rejectDuplicate(input.name);

  try {
    return await prisma.category.create({
      data: { name: input.name, slug, isArchived: false },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryAdminError('CATEGORY_ALREADY_EXISTS', 'Ya existe una categoría con ese nombre.');
    }
    throw error;
  }
}

export async function updateCategoryForAdmin(
  rawCategoryId: unknown,
  rawInput: unknown,
  actor: AdminActor,
) {
  assertAdminActor(actor);
  const categoryId = parseCategoryId(rawCategoryId);
  const input = parseCategoryAdminInput(rawInput);
  await requireCategory(categoryId);
  await rejectDuplicate(input.name, categoryId);

  try {
    return await prisma.category.update({
      where: { id: categoryId },
      data: { name: input.name, slug: categorySlug(input.name) },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryAdminError('CATEGORY_ALREADY_EXISTS', 'Ya existe una categoría con ese nombre.');
    }
    throw error;
  }
}

export async function archiveCategoryForAdmin(rawCategoryId: unknown, actor: AdminActor) {
  assertAdminActor(actor);
  const categoryId = parseCategoryId(rawCategoryId);
  await requireCategory(categoryId);
  return prisma.category.update({
    where: { id: categoryId },
    data: { isArchived: true },
    select: { id: true },
  });
}

export async function restoreCategoryForAdmin(rawCategoryId: unknown, actor: AdminActor) {
  assertAdminActor(actor);
  const categoryId = parseCategoryId(rawCategoryId);
  await requireCategory(categoryId);
  return prisma.category.update({
    where: { id: categoryId },
    data: { isArchived: false },
    select: { id: true },
  });
}

export async function getAdminCategory(categoryId: string) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { products: true } } },
  });
}

export async function getAdminCategoryList(filters: CategoryAdminFilters = {}) {
  const search = filters.search?.trim().slice(0, MAX_CATEGORY_NAME_LENGTH);
  return prisma.category.findMany({
    where: {
      ...(search ? { name: { contains: search } } : {}),
      ...(filters.archive === 'archived' ? { isArchived: true } : {}),
      ...(filters.archive === 'active' || !filters.archive ? { isArchived: false } : {}),
    },
    include: { _count: { select: { products: true } } },
    orderBy: [{ isArchived: 'asc' }, { updatedAt: 'desc' }, { name: 'asc' }],
  });
}
