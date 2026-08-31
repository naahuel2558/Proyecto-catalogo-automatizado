"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      router.push("/perfil")
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
        
        <h1 className="text-3xl font-black font-[Montserrat] text-center mb-8 text-on-surface">Iniciar Sesión</h1>

        {error && (
          <div className="bg-red-500/10 text-red-600 p-4 rounded-xl mb-6 font-body-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-headline-sm text-on-surface">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface p-4 rounded-xl text-on-surface border border-on-surface/10 focus:border-primary focus:outline-none transition-colors"
              placeholder="tu@email.com"
            />
          </div>
          
          <div className="flex flex-col gap-2 mb-2">
            <label className="font-headline-sm text-on-surface">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-surface p-4 rounded-xl text-on-surface border border-on-surface/10 focus:border-primary focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-primary text-white py-4 rounded-full font-headline-sm hover:bg-[#e66000] hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isLoading ? "Iniciando..." : "Ingresar"}
          </button>
        </form>

        <div className="my-6 flex items-center justify-between text-on-surface-variant text-sm">
          <span className="w-1/5 border-b border-on-surface/10"></span>
          <span>o continuar con</span>
          <span className="w-1/5 border-b border-on-surface/10"></span>
        </div>

        <button 
          onClick={() => signIn("google", { callbackUrl: "/perfil" })}
          className="w-full bg-white text-black py-4 rounded-full font-headline-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-6 h-6" />
          Google
        </button>

        <div className="mt-8 text-center text-on-surface-variant font-body-sm">
          ¿No tienes una cuenta? <Link href="/registro" className="text-primary hover:underline font-bold">Regístrate</Link>
        </div>
      </div>
    </div>
  )
}
