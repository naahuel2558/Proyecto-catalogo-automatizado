"use client";
import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

interface HeaderProps {
  cartItemCount: number;
  onOpenCheckout: () => void;
}

export default function Header({ cartItemCount, onOpenCheckout }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <>
      {/* TopNavBar (Hidden on Mobile, Visible on Desktop) */}
      <header className="hidden md:flex justify-between items-center w-full px-margin-desktop py-6 absolute top-0 z-50 bg-transparent text-white transition-all duration-300">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity">
            <img src="/imgs/logo.jpg" alt="Entre Panes Logo" className="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-md" />
            <div className="hidden sm:flex flex-col">
              <h1 className="font-display-lg text-white uppercase tracking-wider drop-shadow-md leading-none">Entre Panes</h1>
              <span className="font-body-md text-white/80 drop-shadow-md">Rotisería & Sándwiches</span>
            </div>
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          {session ? (
            <div className="flex items-center gap-4 font-headline-sm">
              {session.user.role === 'ADMIN' ? (
                <Link href="/admin/productos" className="rounded-full bg-primary px-4 py-2 text-white shadow-md transition-colors hover:bg-[#e66000]">Administrar menú</Link>
              ) : null}
              <Link href="/perfil" className="text-white hover:text-primary transition-colors drop-shadow-md">Mi Perfil</Link>
              <button onClick={() => signOut()} className="text-white/80 hover:text-white transition-colors text-sm cursor-pointer drop-shadow-md">Cerrar Sesión</button>
            </div>
          ) : (
            <Link href="/login" className="text-white hover:text-primary transition-colors flex items-center gap-2 font-headline-sm drop-shadow-md cursor-pointer">
              <span className="material-symbols-outlined">account_circle</span>
              Iniciar Sesión
            </Link>
          )}

          <button 
            onClick={onOpenCheckout}
            className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors flex items-center justify-center relative cursor-pointer"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-sm">
                {cartItemCount}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* Mobile Top AppBar */}
      <header className="md:hidden flex justify-between items-center w-full px-margin-mobile py-4 absolute top-0 z-50 bg-transparent text-white">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img src="/imgs/logo.jpg" alt="Entre Panes Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white/20 shadow-md" />
          <h1 className="text-xl md:text-2xl font-black font-[Montserrat] text-white uppercase tracking-wider drop-shadow-md">Entre Panes</h1>
        </Link>
        
        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              {session.user.role === 'ADMIN' ? (
                <Link href="/admin/productos" aria-label="Administrar productos" className="text-primary transition-colors hover:text-white">
                  <span className="material-symbols-outlined">inventory_2</span>
                </Link>
              ) : null}
              <Link href="/perfil" aria-label="Mi perfil" className="text-white hover:text-primary transition-colors cursor-pointer drop-shadow-md">
                <span className="material-symbols-outlined">account_circle</span>
              </Link>
            </div>
          ) : (
            <Link href="/login" className="text-white hover:text-primary transition-colors cursor-pointer drop-shadow-md">
              <span className="material-symbols-outlined">login</span>
            </Link>
          )}

          <button 
            onClick={onOpenCheckout}
            className="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-colors relative cursor-pointer"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
