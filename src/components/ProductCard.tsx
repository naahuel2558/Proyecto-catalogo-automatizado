import React from 'react';
import Image from 'next/image';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
}

export default function ProductCard({ product, quantity, onIncrease, onDecrease }: ProductCardProps) {
  const isPromo = product.badge === 'Recomendado' || product.badge === 'Promo';

  return (
    <div className={`bg-surface rounded-2xl overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.06)] flex flex-col hover:-translate-y-1 transition-all duration-300 group relative ${
      isPromo 
        ? 'border-2 border-primary/40 hover:shadow-[0px_12px_40px_rgba(255,107,0,0.25)] shadow-[0px_8px_30px_rgba(255,107,0,0.15)]'
        : 'border border-outline-variant/20 hover:shadow-[0px_12px_40px_rgba(0,0,0,0.1)]'
    }`}>
      {product.badge && (
        <div className="absolute top-4 left-4 z-20 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
          {product.badge}
        </div>
      )}

      <div className="h-48 w-full bg-gray-200 relative overflow-hidden flex items-center justify-center">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <>
            <span className="material-symbols-outlined text-6xl text-primary/40 group-hover:scale-110 transition-transform duration-500">
              local_offer
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none"></div>
      </div>

      <div className="p-6 md:p-8 flex-grow flex flex-col gap-4 relative">
        <div className="flex-grow flex flex-col gap-2">
          <h3 className="font-headline-md text-on-surface group-hover:text-primary transition-colors">{product.name}</h3>
          <p className="font-body-md text-on-surface-variant/80 flex items-start gap-2">
            {isPromo && (
              <span className="material-symbols-outlined text-primary text-sm mt-1 shrink-0">info</span>
            )}
            {product.description}
          </p>
        </div>

        <div className={`flex items-center justify-between mt-4 pt-4 border-t ${isPromo ? 'border-primary/20' : 'border-outline-variant/20'}`}>
          <span className="font-headline-md text-primary font-bold">
            ${product.price.toLocaleString('es-AR')}
          </span>
          <div className="flex items-center gap-3 bg-surface-container rounded-full p-1 border border-outline-variant/30">
            <button 
              aria-label="Decrease quantity" 
              onClick={() => onDecrease(product.id)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-white hover:shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <span className="font-headline-sm text-on-surface w-4 text-center">
              {quantity}
            </span>
            <button 
              aria-label="Increase quantity" 
              onClick={() => onIncrease(product.id)}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#e66000] shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
