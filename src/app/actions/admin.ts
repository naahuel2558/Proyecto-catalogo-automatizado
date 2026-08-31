"use server"

import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function getAllUsers() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("No autorizado")
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      _count: {
        select: { orders: true }
      }
    },
    orderBy: {
      orders: {
        _count: "desc"
      }
    }
  })

  return users
}

export async function getUserDetailsAdmin(userId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("No autorizado")
  }

  const userDetails = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          items: true
        }
      }
    }
  })

  if (!userDetails) {
    throw new Error("Usuario no encontrado")
  }

  return userDetails
}
