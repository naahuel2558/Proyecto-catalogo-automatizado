import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserDetailsAdmin } from "@/app/actions/admin"
import Link from "next/link"

export default async function AdminClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/")
  }

  // En Next.js 15+ los params son una Promesa
  const resolvedParams = await params
  let user;

  try {
    user = await getUserDetailsAdmin(resolvedParams.id)
  } catch (err) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center gap-4 text-red-500">
        <p>Usuario no encontrado o error de conexión</p>
        <Link href="/admin/clientes" className="bg-surface-container px-6 py-2 rounded-full text-on-surface">Volver al panel</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface px-margin-mobile md:px-margin-desktop py-12 text-on-surface">
      <div className="max-w-container-max mx-auto flex flex-col gap-8">
        
        {/* Cabecera del Cliente */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-container p-6 md:p-8 rounded-3xl shadow-sm gap-6">
          <div className="flex items-center gap-6">
            {user.image ? (
              <img src={user.image} alt={user.name || "User"} className="w-20 h-20 rounded-full shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-3xl shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black font-[Montserrat] mb-1">{user.name || "Sin nombre"}</h1>
              <p className="text-on-surface-variant font-body-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">mail</span>
                {user.email}
              </p>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                  Rol: {user.role}
                </span>
              </div>
            </div>
          </div>
          
          <Link href="/admin/clientes" className="bg-primary/10 text-primary hover:bg-primary/20 px-6 py-3 rounded-full font-headline-sm transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver a la lista
          </Link>
        </header>

        {/* Historial de Pedidos */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-headline-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Historial de Pedidos ({user.orders.length})
            </h2>
          </div>
          
          {user.orders.length === 0 ? (
            <div className="bg-surface-container rounded-3xl p-10 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">receipt_long</span>
              <p className="font-body-lg text-on-surface-variant">Este cliente no ha realizado ningún pedido aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.orders.map(order => (
                <div key={order.id} className="bg-surface-container rounded-3xl p-6 shadow-sm border border-on-surface/5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-on-surface-variant font-body-sm bg-on-surface/5 px-3 py-1 rounded-full">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-sm text-on-surface-variant font-body-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {new Date(order.createdAt).toLocaleDateString("es-AR", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="flex-grow flex flex-col gap-2 mt-2">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm items-center border-b border-on-surface/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-on-surface flex items-center gap-2">
                          <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {item.quantity}x
                          </span>
                          {item.productName}
                        </span>
                        <span className="text-on-surface-variant font-medium">${item.unitPrice}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-on-surface/10 flex justify-between items-center mt-2">
                    <span className="font-headline-sm text-on-surface">Total pagado</span>
                    <span className="font-bold text-xl text-primary font-[Montserrat]">${order.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
