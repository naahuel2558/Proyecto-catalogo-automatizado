import React from 'react';

interface CartSummaryProps {
  totalItemsCount: number;
  totalPrice: number;
  onOpenCheckout: () => void;
}

export default function CartSummary({ totalItemsCount, totalPrice, onOpenCheckout }: CartSummaryProps) {
  if (totalItemsCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-10px_40px_rgba(255,140,0,0.15)] transition-all duration-500 ease-in-out">
      <div className="max-w-container-max mx-auto px-5 md:px-16 py-4 flex flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <span className="font-label-md text-label-md text-on-surface-variant font-medium">
            Suma Total ({totalItemsCount} {totalItemsCount === 1 ? 'ítem' : 'ítems'}):
          </span>
          <span className="font-headline-md text-xl md:text-3xl font-black text-primary drop-shadow-sm">
            ${totalPrice.toLocaleString('es-AR')}
          </span>
        </div>

        <button
          onClick={onOpenCheckout}
          className="px-6 md:px-10 py-3.5 bg-linear-to-r from-primary-container to-primary hover:from-primary hover:to-primary-container text-on-primary rounded-2xl font-label-md text-sm md:text-lg flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-primary/40 active:scale-95 cursor-pointer transform hover:-translate-y-1"
        >
          <span className="material-symbols-outlined text-xl md:text-2xl animate-bounce">shopping_bag</span>
          <span className="font-black tracking-wide">COMPRAR</span>
        </button>
      </div>
    </div>
  );
}
