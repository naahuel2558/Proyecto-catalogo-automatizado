import Link from 'next/link';
import type { ReactNode } from 'react';

interface AdminShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#f4efe8] text-[#211c17]">
      <header className="border-b border-[#2f271f]/10 bg-[#211c17] text-white">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-4 md:px-10 lg:px-16">
          <Link href="/admin/productos" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_24px_rgba(255,107,0,0.28)]">
              <span className="material-symbols-outlined">inventory_2</span>
            </span>
            <span>
              <span className="block font-[Montserrat] text-sm font-black uppercase tracking-[0.18em]">Entre Panes</span>
              <span className="block text-[11px] text-white/55">Panel comercial</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-bold sm:gap-2">
            <Link href="/admin/productos" className="rounded-full px-3 py-2 text-white transition hover:bg-white/10 sm:px-4">
              Productos
            </Link>
            <Link href="/admin/categorias" className="rounded-full px-3 py-2 text-white/65 transition hover:bg-white/10 hover:text-white sm:px-4">
              Categorías
            </Link>
            <Link href="/admin/clientes" className="rounded-full px-3 py-2 text-white/65 transition hover:bg-white/10 hover:text-white sm:px-4">
              Clientes
            </Link>
            <Link href="/" className="rounded-full px-3 py-2 text-white/65 transition hover:bg-white/10 hover:text-white sm:px-4">
              Ver menú
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-10 md:py-12 lg:px-16">
        <section className="mb-8 grid gap-6 border-b border-[#2f271f]/15 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
            <h1 className="max-w-4xl font-[Montserrat] text-3xl font-black tracking-[-0.04em] md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6256] md:text-base">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </section>

        {children}
      </main>
    </div>
  );
}
