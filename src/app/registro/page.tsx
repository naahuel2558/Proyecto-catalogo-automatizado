"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { registerUser } from "@/app/actions/auth"

export default function RegistroPage() {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    
    const res = await registerUser(formData)

    if (res?.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      router.push("/login?registrado=true")
    }
  }

  return (
    <div className="min-h-screen bg-surface px-margin-mobile md:px-margin-desktop py-12 flex items-center justify-center">
      <div className="w-full max-w-md bg-surface-container p-8 rounded-3xl shadow-sm border border-on-surface/5">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <img src="/imgs/logo.jpg" alt="Logo" className="w-20 h-20 rounded-full shadow-md" />
          </Link>
        </div>
        
        <h1 className="text-3xl font-black font-[Montserrat] text-center mb-8 text-on-surface">Crear Cuenta</h1>

        {error && (
          <div className="bg-red-500/10 text-red-600 p-4 rounded-xl mb-6 font-body-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-headline-sm text-on-surface">Nombre y Apellido</label>
            <input 
              name="name"
              type="text" 
              required
              className="bg-surface p-4 rounded-xl text-on-surface border border-on-surface/10 focus:border-primary focus:outline-none transition-colors"
              placeholder="Juan Pérez"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-headline-sm text-on-surface">Email</label>
            <input 
              name="email"
              type="email" 
              required
              className="bg-surface p-4 rounded-xl text-on-surface border border-on-surface/10 focus:border-primary focus:outline-none transition-colors"
              placeholder="tu@email.com"
            />
          </div>
          
          <div className="flex flex-col gap-2 mb-2">
            <label className="font-headline-sm text-on-surface">Contraseña</label>
            <input 
              name="password"
              type="password" 
              required
              minLength={6}
              className="bg-surface p-4 rounded-xl text-on-surface border border-on-surface/10 focus:border-primary focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-primary text-white py-4 rounded-full font-headline-sm hover:bg-[#e66000] hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 mt-4"
          >
            {isLoading ? "Creando..." : "Registrarme"}
          </button>
        </form>

        <div className="mt-8 text-center text-on-surface-variant font-body-sm">
          ¿Ya tienes una cuenta? <Link href="/login" className="text-primary hover:underline font-bold">Inicia Sesión</Link>
        </div>
      </div>
    </div>
  )
}
