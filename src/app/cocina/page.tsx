import Link from 'next/link';
import type { ReactNode } from 'react';
import KitchenOrderActions from '@/components/kitchen/KitchenOrderActions';
import KitchenRefresh from '@/components/kitchen/KitchenRefresh';
import { requireAdminPage } from '@/lib/admin/page-auth';
import {
  getKitchenBoard,
  getNextKitchenStatuses,
  type KitchenOrder,
} from '@/lib/kitchen/orders';
import { ORDER_STATUS, type OrderStatus } from '@/types';

export const dynamic = 'force-dynamic';

const STATUS_META: Readonly<Record<OrderStatus, {
  label: string;
  shortLabel: string;
  icon: string;
  accent: string;
  badge: string;
}>> = {
  [ORDER_STATUS.DRAFT]: { label: 'Borrador', shortLabel: 'Borrador', icon: 'edit_note', accent: 'border-stone-300', badge: 'bg-stone-100 text-stone-700' },
  [ORDER_STATUS.WAITING_WHATSAPP]: { label: 'Esperando confirmación', shortLabel: 'Por confirmar', icon: 'forum', accent: 'border-amber-400', badge: 'bg-amber-100 text-amber-800' },
  [ORDER_STATUS.CONFIRMED]: { label: 'Confirmado', shortLabel: 'Confirmados', icon: 'receipt_long', accent: 'border-orange-400', badge: 'bg-orange-100 text-orange-800' },
  [ORDER_STATUS.PREPARING]: { label: 'En preparación', shortLabel: 'Preparando', icon: 'skillet', accent: 'border-sky-400', badge: 'bg-sky-100 text-sky-800' },
  [ORDER_STATUS.READY]: { label: 'Listo para entregar', shortLabel: 'Listos', icon: 'room_service', accent: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-800' },
  [ORDER_STATUS.DELIVERED]: { label: 'Entregado', shortLabel: 'Entregados', icon: 'check_circle', accent: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelado', shortLabel: 'Cancelados', icon: 'cancel', accent: 'border-red-400', badge: 'bg-red-100 text-red-700' },
};

const ACTIVE_COLUMNS: readonly OrderStatus[] = [
  ORDER_STATUS.WAITING_WHATSAPP,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
];

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});

function statusOf(order: KitchenOrder): OrderStatus {
  return order.status as OrderStatus;
}

function OrderCard({ order, interactive = true }: { order: KitchenOrder; interactive?: boolean }) {
  const status = statusOf(order);
  const meta = STATUS_META[status];
  return (
    <article className={`rounded-2xl border-t-4 ${meta.accent} bg-white p-4 text-[#211c17] shadow-[0_12px_35px_rgba(14,12,10,0.16)]`}>
      <div className="flex items-start justify-between gap-3 border-b border-[#2f271f]/10 pb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a7b6e]">Pedido</p>
          <h3 className="mt-1 font-[Montserrat] text-lg font-black tracking-[-0.03em]">{order.orderCode}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${meta.badge}`}>{meta.label}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#75685d]">
        <span className="flex items-center gap-1.5 font-bold"><span className="material-symbols-outlined text-base">schedule</span>{dateFormatter.format(order.createdAt)}</span>
        <span className="font-black text-[#211c17]">${order.total.toLocaleString('es-AR')}</span>
      </div>
      <div className="mt-4 rounded-xl bg-[#f4efe8] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7b6e]">Entrega</p>
        <p className="mt-1 text-sm font-black">{order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Retira en el local'}</p>
        {order.address ? <p className="mt-1 text-xs leading-5 text-[#65584d]">{order.address}</p> : null}
        <p className="mt-2 text-xs text-[#75685d]">{order.user?.name ?? order.user?.email ?? 'Pedido invitado'}</p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {order.items.map((item) => (
          <li key={item.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-2 text-sm">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-primary px-2 text-xs font-black text-white">{item.quantity}×</span>
            <span className="pt-1 font-bold leading-5">{item.productName}</span>
            <span className="pt-1 text-xs font-semibold text-[#81756a]">${(item.unitPrice * item.quantity).toLocaleString('es-AR')}</span>
          </li>
        ))}
      </ul>
      {order.notes ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">Atención / notas</p>
          <p className="mt-1 text-sm font-bold leading-5 text-amber-950">{order.notes}</p>
        </div>
      ) : null}
      {interactive ? <KitchenOrderActions orderId={order.id} currentStatus={status} nextStatuses={getNextKitchenStatuses(status)} /> : null}
    </article>
  );
}

function KitchenFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#171411] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171411]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-[0_8px_28px_rgba(255,107,0,0.28)]"><span className="material-symbols-outlined">skillet</span></span>
            <span><span className="block font-[Montserrat] text-base font-black uppercase tracking-[0.16em]">Entre Panes</span><span className="block text-[11px] text-white/45">Puesto de Cocina</span></span>
          </Link>
          <KitchenRefresh />
        </div>
      </header>
      {children}
    </div>
  );
}

export default async function KitchenPage() {
  await requireAdminPage();

  let board: Awaited<ReturnType<typeof getKitchenBoard>>;
  try {
    board = await getKitchenBoard();
  } catch (error) {
    console.error('Error leyendo pedidos para Cocina:', error);
    return (
      <KitchenFrame>
        <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-5 py-12">
          <section className="w-full rounded-[28px] border border-red-400/25 bg-red-500/10 p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-red-300">database_off</span>
            <h1 className="mt-4 font-[Montserrat] text-2xl font-black">No pudimos cargar Cocina</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">La base de datos no respondió correctamente. Actualiza la vista; si continúa, revisa el servicio antes de operar pedidos.</p>
          </section>
        </main>
      </KitchenFrame>
    );
  }

  const activeCount = board.activeOrders.length;
  return (
    <KitchenFrame>
      <main className="mx-auto w-full max-w-[1800px] px-4 py-6 md:px-8 md:py-8">
        <section className="mb-7 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Operación en vivo</p>
            <h1 className="mt-2 font-[Montserrat] text-3xl font-black tracking-[-0.04em] md:text-5xl">Cocina en marcha.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Pedidos reales desde la base de datos. Cada tarjeta avanza una sola etapa y conserva exactamente lo que compró el cliente.</p>
          </div>
          <div className="flex items-baseline gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
            <span className="font-[Montserrat] text-3xl font-black text-primary">{activeCount}</span>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">pedidos activos</span>
          </div>
        </section>

        {activeCount === 0 ? (
          <section className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <div className="max-w-md">
              <span className="material-symbols-outlined text-6xl text-white/20">room_service</span>
              <h2 className="mt-4 font-[Montserrat] text-2xl font-black">No hay pedidos pendientes.</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">Los pedidos creados por Secure Checkout aparecerán automáticamente en este tablero.</p>
            </div>
          </section>
        ) : (
          <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ACTIVE_COLUMNS.map((status) => {
              const orders = board.activeOrders.filter((order) => order.status === status);
              const meta = STATUS_META[status];
              return (
                <section key={status} className="min-w-0 rounded-[24px] border border-white/10 bg-white/[0.045] p-3">
                  <header className="mb-3 flex items-center justify-between gap-3 px-1 py-2">
                    <h2 className="flex items-center gap-2 font-[Montserrat] text-sm font-black"><span className="material-symbols-outlined text-xl text-primary">{meta.icon}</span>{meta.shortLabel}</h2>
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/10 px-2 text-xs font-black">{orders.length}</span>
                  </header>
                  <div className="space-y-3">
                    {orders.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs font-semibold text-white/30">Sin pedidos</p> : orders.map((order) => <OrderCard key={order.id} order={order} />)}
                  </div>
                </section>
              );
            })}
          </section>
        )}

        {board.recentOrders.length > 0 ? (
          <section className="mt-10 border-t border-white/10 pt-7">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Cierre reciente</p>
              <h2 className="mt-1 font-[Montserrat] text-xl font-black">Últimos pedidos finalizados</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {board.recentOrders.map((order) => <OrderCard key={order.id} order={order} interactive={false} />)}
            </div>
          </section>
        ) : null}
      </main>
    </KitchenFrame>
  );
}
