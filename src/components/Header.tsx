import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  cartItemCount: number;
  onOpenCheckout: () => void;
}

export default function Header({ cartItemCount, onOpenCheckout }: HeaderProps) {
  return (
    <header className="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-lg top-0 border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-5 md:px-16 py-4 sticky z-50 transition-all duration-300">
      <Link href="/" className="flex items-center gap-2 group cursor-pointer">
        <span className="material-symbols-outlined text-primary text-3xl filled-icon group-hover:scale-110 transition-transform duration-300">
          lunch_dining
        </span>
        <h1 className="font-display-lg text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent uppercase tracking-wider group-hover:tracking-widest transition-all duration-300">
          Entre Panes
        </h1>
      </Link>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCheckout}
          className="relative p-2 text-on-surface-variant hover:text-primary-container transition-colors duration-200 cursor-pointer"
          title="Carrito de Compras"
        >
          <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-0 bg-primary-container text-on-primary font-label-sm text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse font-bold">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
