"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getAllUsers } from "@/app/actions/admin"
import Link from "next/link"

type UserData = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  _count: {
    orders: number
  }
}

export default function AdminClientesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }

    const fetchUsers = async () => {
      try {
        const data = await getAllUsers()
        setUsers(data)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Error desconocido")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [session, status, router])

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-surface flex justify-center items-center text-on-surface">Cargando panel...</div>
  }

  if (error) {
    return <div className="min-h-screen bg-surface flex justify-center items-center text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen bg-surface px-margin-mobile md:px-margin-desktop py-12 text-on-surface">
      <div className="max-w-container-max mx-auto flex flex-col gap-8">
        <header className="flex justify-between items-center bg-surface-container p-6 rounded-3xl shadow-sm">
          <div>
            <h1 className="text-3xl font-black font-[Montserrat]">Administración de Clientes</h1>
            <p className="text-on-surface-variant font-body-lg">Listado de todos los usuarios registrados</p>
          </div>
          <Link href="/" className="bg-primary/10 text-primary hover:bg-primary/20 px-6 py-3 rounded-full font-headline-sm transition-colors cursor-pointer">
            Volver al Menú
          </Link>
        </header>

        <section className="bg-surface-container rounded-3xl p-6 md:p-8 shadow-sm border border-on-surface/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-on-surface/10 text-on-surface-variant font-headline-sm">
                  <th className="py-4 px-4">Cliente</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Rol</th>
                  <th className="py-4 px-4 text-center">Pedidos</th>
                  <th className="py-4 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-on-surface/5 hover:bg-on-surface/5 transition-colors">
                    <td className="py-4 px-4 flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt={user.name || ""} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      <span className="font-body-lg font-medium">{user.name || "Sin nombre"}</span>
                    </td>
                    <td className="py-4 px-4 text-on-surface-variant">{user.email}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold font-headline-sm text-lg">
                      {user._count.orders}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Link 
                        href={`/admin/clientes/${user.id}`} 
                        className="inline-block bg-primary text-white px-4 py-2 rounded-full font-headline-sm hover:bg-[#e66000] hover:-translate-y-1 transition-all duration-300 shadow-sm"
                      >
                        Ver Historial
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant font-body-lg">
                No hay usuarios registrados aún.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
