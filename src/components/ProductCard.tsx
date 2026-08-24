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
  return (
    <article className={`bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col group transition-all duration-300 border ${
      quantity > 0 
        ? 'border-2 border-primary ring-2 ring-primary/20 shadow-[0_10px_30px_rgba(144,77,0,0.15)] transform scale-[1.02]' 
        : 'border-outline-variant/30 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]'
    }`}>
      
      {/* Image & Badges */}
      <div className="h-48 w-full bg-surface-variant relative overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-fixed text-primary font-bold text-4xl">
            🥪
          </div>
        )}

        {product.badge && (
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-full shadow-sm border ${
            product.badge === 'Recomendado'
              ? 'bg-surface text-primary-container border-outline-variant/20'
              : 'bg-primary-container text-on-primary border-primary-container'
          }`}>
            <span className="font-label-sm text-label-sm">{product.badge}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-headline-sm text-headline-sm text-on-surface pr-4 leading-snug">
            {product.name}
          </h3>
          <span className="font-headline-sm text-headline-sm text-primary-container whitespace-nowrap">
            ${product.price.toLocaleString('es-AR')}
          </span>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant mb-6 grow leading-relaxed">
          {product.description}
        </p>

        {/* Quantity Control (- 0 +) */}
        <div className={`flex items-center justify-between border rounded-lg p-1 transition-colors ${
          quantity > 0 ? 'border-primary/50 bg-surface' : 'border-outline-variant/50 bg-surface'
        }`}>
          <button
            aria-label="Disminuir cantidad"
            onClick={() => onDecrease(product.id)}
            disabled={quantity === 0}
            className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
              quantity > 0
                ? 'text-on-surface-variant hover:bg-surface-variant cursor-pointer'
                : 'text-outline/40 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined">remove</span>
          </button>

          <span className={`w-8 text-center font-label-md text-label-md ${quantity > 0 ? 'text-primary' : 'text-on-surface'}`}>
            {quantity}
          </span>

          <button
            aria-label="Aumentar cantidad"
            onClick={() => onIncrease(product.id)}
            className="w-10 h-10 flex items-center justify-center bg-primary-container text-on-primary rounded-md hover:bg-primary transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
    </article>
  );
}
