'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { AdminAuthorizationError } from '@/lib/admin/authorization';
import {
  archiveProductForAdmin,
  createProductForAdmin,
  ProductAdminError,
  restoreProductForAdmin,
  setProductAvailabilityForAdmin,
  setProductFeaturedForAdmin,
  updateProductForAdmin,
} from '@/lib/admin/products';

type ProductAdminActionResult =
  | { success: true; productId: string }
  | {
      success: false;
      error: {
        code:
          | 'UNAUTHORIZED'
          | 'FORBIDDEN'
          | 'INVALID_INPUT'
          | 'CATEGORY_NOT_FOUND'
          | 'CATEGORY_ARCHIVED'
          | 'PRODUCT_NOT_FOUND'
          | 'DATABASE_ERROR';
        message: string;
      };
    };

async function getActor() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

function refreshProductViews(productId?: string) {
  revalidatePath('/');
  revalidatePath('/admin/productos', 'layout');
  if (productId) revalidatePath(`/admin/productos/${productId}`);
}

function controlledError(error: unknown): ProductAdminActionResult {
  if (error instanceof AdminAuthorizationError || error instanceof ProductAdminError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }

  console.error('Error inesperado en administración de productos:', error);
  return {
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'No pudimos guardar el cambio. Intenta nuevamente.',
    },
  };
}

export async function createProductAction(input: unknown): Promise<ProductAdminActionResult> {
  try {
    const product = await createProductForAdmin(input, await getActor());
    refreshProductViews(product.id);
    return { success: true, productId: product.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function updateProductAction(
  productId: unknown,
  input: unknown,
): Promise<ProductAdminActionResult> {
  try {
    const product = await updateProductForAdmin(productId, input, await getActor());
    refreshProductViews(product.id);
    return { success: true, productId: product.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function setProductAvailabilityAction(
  productId: unknown,
  isAvailable: unknown,
): Promise<ProductAdminActionResult> {
  try {
    const product = await setProductAvailabilityForAdmin(productId, isAvailable, await getActor());
    refreshProductViews(product.id);
    return { success: true, productId: product.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function setProductFeaturedAction(
  productId: unknown,
  isFeatured: unknown,
): Promise<ProductAdminActionResult> {
  try {
    const product = await setProductFeaturedForAdmin(productId, isFeatured, await getActor());
    refreshProductViews(product.id);
    return { success: true, productId: product.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function archiveProductAction(productId: unknown): Promise<ProductAdminActionResult> {
  try {
    const product = await archiveProductForAdmin(productId, await getActor());
    refreshProductViews(product.id);
    return { success: true, productId: product.id };
  } catch (error) {
    return controlledError(error);
  }
}

export async function restoreProductAction(productId: unknown): Promise<ProductAdminActionResult> {
  try {
    const product = await restoreProductForAdmin(productId, await getActor());
    refreshProductViews(product.id);
    return { success: true, productId: product.id };
  } catch (error) {
    return controlledError(error);
  }
}
