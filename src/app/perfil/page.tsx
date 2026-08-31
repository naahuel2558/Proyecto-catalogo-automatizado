import { getUserOrders } from "@/app/actions/order"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/")
  }

  const orders = await getUserOrders()

  return (
    <div className="min-h-screen bg-surface px-margin-mobile md:px-margin-desktop py-12 text-on-surface">
      <div className="max-w-container-max mx-auto flex flex-col gap-8">
        <header className="flex justify-between items-center bg-surface-container p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4">
            {session.user?.image && (
              <img src={session.user.image} alt={session.user.name || "User"} className="w-16 h-16 rounded-full shadow-md" />
            )}
            <div>
              <h1 className="text-3xl font-black font-[Montserrat]">{session.user?.name}</h1>
              <p className="text-on-surface-variant font-body-lg">{session.user?.email}</p>
            </div>
          </div>
          <Link href="/" className="bg-primary/10 text-primary hover:bg-primary/20 px-6 py-3 rounded-full font-headline-sm transition-colors cursor-pointer">
            Volver al Menú
          </Link>
        </header>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold font-headline-lg">Historial de Pedidos</h2>
          
          {orders.length === 0 ? (
            <div className="bg-surface-container rounded-3xl p-10 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">receipt_long</span>
              <p className="font-body-lg text-on-surface-variant">Aún no tienes pedidos registrados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map(order => (
                <div key={order.id} className="bg-surface-container rounded-3xl p-6 shadow-sm border border-on-surface/5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-on-surface-variant font-body-sm bg-on-surface/5 px-3 py-1 rounded-full">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="font-bold text-primary font-headline-sm">
                      ${order.total.toLocaleString('es-AR')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-grow">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm font-body-md border-b border-on-surface/5 pb-2 last:border-0 last:pb-0">
                        <span>{item.quantity}x {item.productName}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-4 border-t border-on-surface/10">
                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {new Date(order.createdAt).toLocaleDateString('es-AR')}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-600 px-3 py-1 rounded-full">
                      {order.status}
                    </span>
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
