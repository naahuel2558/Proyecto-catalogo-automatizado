'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { AdminAuthorizationError } from '@/lib/admin/authorization';
import {
  archiveCategoryForAdmin,
  CategoryAdminError,
  createCategoryForAdmin,
  restoreCategoryForAdmin,
  updateCategoryForAdmin,
} from '@/lib/admin/categories';

type CategoryAdminActionResult =
  | { success: true; categoryId: string }
  | {
      success: false;
      error: {
        code:
          | 'UNAUTHORIZED'
          | 'FORBIDDEN'
          | 'INVALID_INPUT'
          | 'CATEGORY_NOT_FOUND'
          | 'CATEGORY_ALREADY_EXISTS'
          | 'DATABASE_ERROR';
        message: string;
      };
    };

async function getActor() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

function refreshCategoryViews(categoryId?: string) {
  revalidatePath('/');
  revalidatePath('/admin/categorias', 'layout');
  revalidatePath('/admin/productos', 'layout');
  if (categoryId) revalidatePath(`/admin/categorias/${categoryId}`);
}

function controlledError(error: unknown): CategoryAdminActionResult {
  if (error instanceof AdminAuthorizationError || error instanceof CategoryAdminError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }

  console.error('Error inesperado en administración de categorías:', error);
  return {
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'No pudimos guardar el cambio. Intenta nuevamente.',
    },
  };
}

export async function createCategoryAction(input: unknown): Promise<CategoryAdminActionResult> {
  try {
    const category = await createCategoryForAdmin(input, await getActor());
    refreshCategoryViews(category.id);
    return { success: true, categoryId: category.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function updateCategoryAction(
  categoryId: unknown,
  input: unknown,
): Promise<CategoryAdminActionResult> {
  try {
    const category = await updateCategoryForAdmin(categoryId, input, await getActor());
    refreshCategoryViews(category.id);
    return { success: true, categoryId: category.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function archiveCategoryAction(categoryId: unknown): Promise<CategoryAdminActionResult> {
  try {
    const category = await archiveCategoryForAdmin(categoryId, await getActor());
    refreshCategoryViews(category.id);
    return { success: true, categoryId: category.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function restoreCategoryAction(categoryId: unknown): Promise<CategoryAdminActionResult> {
  try {
    const category = await restoreCategoryForAdmin(categoryId, await getActor());
    refreshCategoryViews(category.id);
    return { success: true, categoryId: category.id };
  } catch (error) {
    return controlledError(error);
  }
}
