'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { AdminAuthorizationError } from '@/lib/admin/authorization';
import {
  KitchenOrderError,
  transitionOrderStatusForKitchen,
} from '@/lib/kitchen/orders';
import type { OrderStatus } from '@/types';

type KitchenActionResult =
  | { success: true; orderId: string; status: OrderStatus }
  | {
      success: false;
      error: {
        code:
          | 'UNAUTHORIZED'
          | 'FORBIDDEN'
          | 'INVALID_INPUT'
          | 'ORDER_NOT_FOUND'
          | 'INVALID_STATUS_TRANSITION'
          | 'DATABASE_ERROR';
        message: string;
      };
    };

export async function transitionKitchenOrderAction(
  orderId: unknown,
  expectedStatus: unknown,
  nextStatus: unknown,
): Promise<KitchenActionResult> {
  try {
    const session = await getServerSession(authOptions);
    const order = await transitionOrderStatusForKitchen(
      orderId,
      expectedStatus,
      nextStatus,
      session?.user ?? null,
    );
    revalidatePath('/cocina');
    revalidatePath('/perfil');
    return { success: true, orderId: order.id, status: order.status };
  } catch (error) {
    if (error instanceof AdminAuthorizationError || error instanceof KitchenOrderError) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
    console.error('Error inesperado actualizando un pedido de Cocina:', error);
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'No pudimos actualizar el pedido. Actualiza la vista e intenta nuevamente.',
      },
    };
  }
}
