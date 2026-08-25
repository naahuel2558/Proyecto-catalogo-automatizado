'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '@/types';
import Link from 'next/link';

export default function KitchenReceiptsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = () => {
    try {
      const stored = localStorage.getItem('entrepanes_orders');
      if (stored) {
        setOrders(JSON.parse(stored));
      } else {
        const demoOrder: Order = {
          id: '1001',
          customerName: 'Juan Pérez',
          customerPhone: '+54 9 358 1234567',
          address: 'Calle Falsa 123 (esq. San Martín)',
          deliveryNotes: 'Sin tomate en el lomo',
          isPickup: false,
          items: [
            { product: { id: '1', name: 'Lomo Entre Panes Especial', description: '', price: 9500, category: 'lomos', available: true }, quantity: 1 },
            { product: { id: '2', name: 'Sándwich de Milanesa Completo', description: '', price: 9000, category: 'milanesas', available: true }, quantity: 1 },
            { product: { id: '3', name: 'Papas Fritas Grandes con Cheddar', description: '', price: 4500, category: 'papas', available: true }, quantity: 1 },
          ],
          totalAmount: 23000,
          paymentMethod: 'Efectivo',
          status: 'PENDIENTE',
          createdAt: '21-08-2026 - 21:30',
        };
        setOrders([demoOrder]);
        localStorage.setItem('entrepanes_orders', JSON.stringify([demoOrder]));
      }
    } catch (e) {
      console.error('Error cargando recibos:', e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 0);
    const interval = setInterval(loadOrders, 3000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleMarkDespatched = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('entrepanes_orders', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen flex flex-col font-body-md bg-background text-on-surface pb-20 md:pb-12">
      {/* TopNavBar */}
      <nav className="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-lg sticky top-0 z-50 border-b border-outline-variant/30 px-5 md:px-16 py-4 flex justify-between items-center shadow-sm">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="material-symbols-outlined text-primary text-3xl filled-icon group-hover:scale-110 transition-transform duration-300">
            lunch_dining
          </span>
          <span className="font-display-lg text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent uppercase tracking-wider">
            Entre Panes
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-label-md transition-colors border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-base text-primary">restaurant_menu</span>
            <span className="hidden sm:inline font-bold">Ver Menú</span>
          </Link>
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="grow flex flex-col items-center py-8 md:py-12 px-5 md:px-16 max-w-container-max mx-auto w-full gap-6">
        {/* Header Card */}
        <div className="w-full bg-surface-container-lowest rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 rounded-full bg-surface-container hover:bg-surface-variant transition-colors text-on-surface flex items-center justify-center cursor-pointer border border-outline-variant/30"
              title="Volver al menú"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-headline-md text-xl md:text-2xl font-bold text-on-surface">
                Recepción de Recibos - Entre Panes
              </h1>
              <p className="font-label-md text-xs md:text-sm text-on-surface-variant mt-0.5">
                Vista simple para el personal del negocio
              </p>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            className="bg-primary-container text-on-primary rounded-xl px-5 py-2.5 font-label-md text-xs md:text-sm flex items-center gap-2 hover:shadow-[0px_4px_12px_rgba(255,140,0,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer font-bold"
          >
            <span className={`material-symbols-outlined text-lg ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Actualizar</span>
          </button>
        </div>

        {/* Orders Content */}
        {orders.length === 0 ? (
          /* Empty State Canvas */
          <div className="w-full grow flex items-center justify-center bg-surface-container-lowest rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] border border-surface-variant p-10 md:p-16 min-h-[380px]">
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="relative w-28 h-28 mb-5 flex items-center justify-center rounded-full bg-surface-container-low">
                <span className="material-symbols-outlined text-outline text-5xl filled-icon">
                  restaurant
                </span>
                <div
                  className="absolute inset-0 border border-outline-variant rounded-full animate-ping opacity-20"
                  style={{ animationDuration: '3s' }}
                ></div>
                <div className="absolute -inset-3 border border-outline-variant/40 rounded-full opacity-10"></div>
              </div>
              <h2 className="font-headline-sm text-lg md:text-xl font-bold text-on-surface mb-2">
                No hay recibos pendientes
              </h2>
              <p className="font-body-md text-xs md:text-sm text-on-surface-variant leading-relaxed">
                Los recibos de los clientes aparecerán aquí automáticamente una vez que se realicen nuevos pedidos.
              </p>
            </div>
          </div>
        ) : (
          /* Orders List */
          <div className="w-full space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between border-b border-surface-variant/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs">
                        RECIBO #{order.id}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                        PENDIENTE
                      </span>
                    </div>
                    <span className="font-label-sm text-xs text-on-surface-variant/80">
                      {order.createdAt}
                    </span>
                  </div>

                  <div className="bg-surface-container/60 p-3.5 rounded-xl border border-outline-variant/30 text-xs md:text-sm space-y-1.5">
                    <p className="text-on-surface font-semibold">
                      <span className="text-on-surface-variant font-normal">Cliente:</span> {order.customerName}
                    </p>
                    <p className="text-on-surface font-semibold">
                      <span className="text-on-surface-variant font-normal">Celular:</span>{' '}
                      <span className="text-primary font-bold">{order.customerPhone}</span>
                    </p>
                    <div className="flex flex-col gap-1.5 mt-2 p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
                      <p className="text-on-surface font-semibold flex items-center gap-1.5">
                        <span className="text-on-surface-variant font-normal">Tipo:</span>{' '}
                        {order.isPickup ? (
                          <span className="text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] uppercase tracking-wide"><span className="material-symbols-outlined text-[14px]">storefront</span> Retira local</span>
                        ) : (
                          <span className="text-blue-600 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] uppercase tracking-wide"><span className="material-symbols-outlined text-[14px]">local_shipping</span> Delivery</span>
                        )}
                      </p>
                      {!order.isPickup && (
                        <p className="text-on-surface font-semibold">
                          <span className="text-on-surface-variant font-normal">Dirección:</span>{' '}
                          {order.address}
                        </p>
                      )}
                      {order.deliveryNotes && (
                        <p className="text-on-surface font-semibold">
                          <span className="text-on-surface-variant font-normal">Detalles / Aclaración:</span>{' '}
                          <span className="text-amber-600 dark:text-amber-400">{order.deliveryNotes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p className="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Detalle del Pedido:
                    </p>
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="text-xs md:text-sm text-on-surface flex items-center gap-2">
                          <span className="font-black text-primary bg-primary-container/20 px-2 py-0.5 rounded-md text-xs">
                            {item.quantity}x
                          </span>
                          <span>{item.product.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 flex items-baseline justify-between">
                    <span className="text-xs font-label-md text-on-surface-variant">Importe Total:</span>
                    <span className="font-headline-md text-lg md:text-xl font-black text-primary">
                      ${order.totalAmount.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-end md:self-center">
                  <button
                    onClick={() => handleMarkDespatched(order.id)}
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-label-md text-xs md:text-sm font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>Despachar Pedido</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-surface/90 backdrop-blur-md shadow-lg border-t border-outline-variant/30">
        <Link
          href="/"
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors py-1 px-3 rounded-xl"
        >
          <span className="material-symbols-outlined text-xl">lunch_dining</span>
          <span className="font-label-sm text-[10px] mt-0.5">Menú</span>
        </Link>
        <Link
          href="/cocina"
          className="flex flex-col items-center justify-center text-primary font-bold py-1 px-3 rounded-xl bg-primary-container/10"
        >
          <span className="material-symbols-outlined text-xl filled-icon">receipt_long</span>
          <span className="font-label-sm text-[10px] mt-0.5">Cocina</span>
        </Link>
      </nav>
    </div>
  );
}
