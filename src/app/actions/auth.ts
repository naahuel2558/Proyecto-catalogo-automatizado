"use server"

import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function registerUser(data: FormData) {
  const name = data.get("name") as string
  const email = data.get("email") as string
  const password = data.get("password") as string

  if (!name || !email || !password) {
    return { error: "Todos los campos son obligatorios" }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: "Este correo electrónico ya está registrado" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error al registrar:", error)
    return { error: "Ocurrió un error al registrar el usuario" }
  }
}
