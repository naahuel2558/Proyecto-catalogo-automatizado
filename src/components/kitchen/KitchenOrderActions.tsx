'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transitionKitchenOrderAction } from '@/app/actions/kitchen';
import { ORDER_STATUS, type OrderStatus } from '@/types';

const ACTION_LABELS: Readonly<Partial<Record<OrderStatus, string>>> = {
  [ORDER_STATUS.CONFIRMED]: 'Confirmar pedido',
  [ORDER_STATUS.PREPARING]: 'Comenzar preparación',
  [ORDER_STATUS.READY]: 'Marcar como listo',
  [ORDER_STATUS.DELIVERED]: 'Marcar entregado',
};

export default function KitchenOrderActions({
  orderId,
  currentStatus,
  nextStatuses,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  nextStatuses: readonly OrderStatus[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function run(nextStatus: OrderStatus) {
    if (nextStatus === ORDER_STATUS.CANCELLED && !window.confirm('¿Cancelar este pedido? La operación no puede revertirse desde Cocina.')) return;
    setError('');
    startTransition(async () => {
      const result = await transitionKitchenOrderAction(orderId, currentStatus, nextStatus);
      if (!result.success) setError(result.error.message);
      router.refresh();
    });
  }

  const primaryStatuses = nextStatuses.filter((status) => status !== ORDER_STATUS.CANCELLED);
  const canCancel = nextStatuses.includes(ORDER_STATUS.CANCELLED);

  return (
    <div className="mt-5 border-t border-[#2f271f]/10 pt-4">
      <div className="grid gap-2">
        {primaryStatuses.map((status) => (
          <button key={status} type="button" onClick={() => run(status)} disabled={isPending} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#211c17] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(33,28,23,0.16)] transition hover:bg-primary disabled:opacity-50">
            <span className={`material-symbols-outlined text-lg ${isPending ? 'animate-spin' : ''}`}>{isPending ? 'progress_activity' : 'arrow_forward'}</span>
            {ACTION_LABELS[status]}
          </button>
        ))}
        {canCancel ? (
          <button type="button" onClick={() => run(ORDER_STATUS.CANCELLED)} disabled={isPending} className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50">Cancelar pedido</button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-5 text-red-700">{error}</p> : null}
    </div>
  );
}
