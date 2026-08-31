"use server"

import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  CheckoutError,
  createSecureOrder,
  type CheckoutErrorCode,
  type SecureOrderDto,
} from "@/lib/orders/secure-checkout"

type CreateOrderResult =
  | {
      success: true;
      order: SecureOrderDto;
      customerName: string;
      customerPhone: string;
      whatsappUrl: string;
    }
  | {
      success: false;
      error: { code: CheckoutErrorCode; message: string };
    };

export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  const session = await getServerSession(authOptions)

  try {
    const result = await createSecureOrder(input, session?.user?.id ?? null)
    revalidatePath('/cocina')
    return { success: true, ...result }
  } catch (error) {
    if (error instanceof CheckoutError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      }
    }

    console.error("Error creando pedido seguro:", error)
    return {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "No pudimos registrar el pedido. Intenta nuevamente.",
      },
    }
  }
}

export async function getUserOrders() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error("No autorizado")
  }
  
  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id
    },
    include: {
      items: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  return orders
}
