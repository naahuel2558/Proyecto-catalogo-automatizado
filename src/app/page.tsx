'use client';

import React, { useState } from 'react';
import { INITIAL_PRODUCTS } from '@/lib/data/menu';
import { Product, Order } from '@/types';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import CartSummary from '@/components/CartSummary';
import CheckoutModal from '@/components/CheckoutModal';

// Número oficial de WhatsApp de la rotisería Entre Panes
const ROTISERIA_WHATSAPP_NUMBER = '5493585762463';

export default function MenuPage() {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  // Map de productId -> cantidad
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  // Estados del envío
  const [isSending, setIsSending] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<{ id: string; phone: string; whatsappUrl: string } | null>(null);

  // Campos del formulario
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+54 ');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [orderDetails, setOrderDetails] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Incrementar cantidad de producto
  const handleIncrease = (productId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  // Decrementar cantidad de producto
  const handleDecrease = (productId: string) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  // Calcular cantidad total e importe total
  const selectedItems = products
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((p) => ({
      product: p,
      quantity: quantities[p.id] || 0,
    }));

  const totalItemsCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Filter products based on active category
  const filteredProducts = products.filter((p) => {
    if (activeCategory === 'Todos') return true;
    if (activeCategory === 'Sándwiches') return p.category === 'lomos' || p.category === 'milanesas';
    if (activeCategory === 'Burgers') return p.category === 'hamburguesas';
    return true;
  });

  const handleComprar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    if (!customerName || !customerPhone || customerPhone.trim() === '+54') {
      alert('Por favor completa tu Nombre y Celular (con +54).');
      return;
    }
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      alert('Por favor completa los detalles de dónde enviar el pedido.');
      return;
    }

    setIsSending(true);

    const orderId = (Date.now() % 9000 + 1000).toString();
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Detalle del pedido en texto plano
    let itemsText = '';
    selectedItems.forEach((item) => {
      itemsText += `${item.quantity}x _${item.product.name}_\n`;
    });

    const deliveryText = deliveryMethod === 'delivery' 
      ? `_Envío a domicilio_\n\n_Dirección / Detalles de envío:_\n${deliveryAddress}` 
      : `_Retira en el local_`;

    const notesText = orderDetails ? `\n\n_Detalles del pedido:_\n${orderDetails}` : '';

    // Formato estructurado del recibo
    const receiptText = `_Entre Panes - Recibo de Pedido_\n\n_Número de pedido:_\n${orderId}\n\n_Nombre:_\n${customerName}\n\n_Celular del cliente:_\n${customerPhone}\n\n${deliveryText}${notesText}\n\n_Fecha y Hora:_\n${formattedDate}\n\n${itemsText}\n_Valor Total:_\n$${totalPrice.toLocaleString('es-AR')}.00`;

    // Registrar pedido en localStorage para que el personal del local lo vea en /cocina
    const newOrder: Order = {
      id: orderId,
      customerName,
      customerPhone,
      address: deliveryMethod === 'delivery' ? deliveryAddress : 'Retira en local',
      deliveryNotes: orderDetails,
      isPickup: deliveryMethod === 'pickup',
      items: selectedItems,
      totalAmount: totalPrice,
      paymentMethod: 'Efectivo',
      status: 'PENDIENTE',
      createdAt: formattedDate,
    };

    const existingOrdersJson = localStorage.getItem('entrepanes_orders') || '[]';
    const existingOrders = JSON.parse(existingOrdersJson);
    localStorage.setItem('entrepanes_orders', JSON.stringify([newOrder, ...existingOrders]));

    // URL manual de WhatsApp de respaldo
    const encodedText = encodeURIComponent(receiptText);
    const whatsappUrl = `https://wa.me/${ROTISERIA_WHATSAPP_NUMBER}?text=${encodedText}`;

    try {
      // Enviar automáticamente el recibo vía API del bot al número del usuario
      await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          locationDetails: deliveryMethod === 'delivery' ? deliveryAddress : 'Retira en local',
          receiptText,
          order: newOrder,
        }),
      });
    } catch (err) {
      console.error('Error al llamar API send-receipt:', err);
    } finally {
      setIsSending(false);
      setOrderCompleted({ id: orderId, phone: customerPhone, whatsappUrl });
    }
  };

  const handleCloseModal = () => {
    setIsCheckoutOpen(false);
    if (orderCompleted) {
      setQuantities({});
      setOrderCompleted(null);
    }
  };

  return (
    <>
      <Header 
        cartItemCount={totalItemsCount} 
        onOpenCheckout={() => {
          if (totalItemsCount > 0) setIsCheckoutOpen(true);
        }} 
      />

      {/* Full Width Hero Section */}
      <section className="w-full relative h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 scale-105" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDhR8XGXHgtYREhxx7sDEE7PmQnhxmD4NlyWnPlgciGkzYfVAXmxm2nJWwfo0V0ZRKmfKoW4TGd_CaMGVpXAmDib-xbaDgTWBV8k7Sjq_jpm9hco0Ic_cUcXhZd7PekQ5rnXBdTGXTewQwv79v_z53DHFQEhCeHAPZhIusfPYzKE9Fl-Bsg54H5N2H-x-3AdeQNpbSC3R6pSxILUW_ep_cHVWt2NrYHl9CFAmNwyaa4iHwWWsJTpqiO')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60 z-10" />
        <div className="relative z-20 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col items-center text-center gap-8 mt-16">
          <h2 className="font-[Montserrat] font-extrabold text-5xl md:text-7xl text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] tracking-tight leading-tight">
            Sabor que Desborda
          </h2>
          <p className="font-body-lg text-white/90 max-w-2xl text-lg md:text-xl drop-shadow-md">
            Disfrutá de los mejores sándwiches y hamburguesas artesanales de la ciudad. Ingredientes frescos, porciones generosas y un sabor inigualable.
          </p>
          
          {/* Discreet Info */}
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-white/70 text-sm md:text-base font-body-sm mt-2 mb-2 drop-shadow-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">location_on</span> 
              Dirección de tu Local
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">schedule</span> 
              Mar-Dom 20:00 a 00:00
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">phone_iphone</span> 
              +54 9 358 576 2463
            </span>
          </div>

          <button className="bg-primary text-white font-headline-sm py-4 px-10 rounded-full w-max hover:bg-[#e66000] hover:shadow-[0_8px_24px_rgba(255,107,0,0.4)] hover:-translate-y-1 transition-all duration-300 mt-2 tracking-wide cursor-pointer">
            Ver Menú
          </button>
        </div>
      </section>

      <main className="grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 flex flex-col gap-16 -mt-8 relative z-30">
        
        {/* Category Filters */}
        <section className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x items-center justify-center md:justify-start">
          {['Todos', 'Sándwiches', 'Burgers'].map((category) => (
            <button 
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`snap-start shrink-0 px-8 py-4 rounded-full font-headline-sm shadow-md transition-all cursor-pointer ${
                activeCategory === category
                  ? 'bg-primary text-white hover:scale-105'
                  : 'bg-surface-container text-on-surface hover:bg-surface-variant hover:text-primary'
              }`}
            >
              {category}
            </button>
          ))}
        </section>

        {/* Product Catalog */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-24">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={quantities[product.id] || 0}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          ))}
        </section>
      </main>

      <CartSummary 
        totalItemsCount={totalItemsCount} 
        totalPrice={totalPrice} 
        onOpenCheckout={() => setIsCheckoutOpen(true)} 
      />

      {isCheckoutOpen && (
        <CheckoutModal
          totalPrice={totalPrice}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
          orderDetails={orderDetails}
          setOrderDetails={setOrderDetails}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
          isSending={isSending}
          orderCompleted={orderCompleted}
          onClose={handleCloseModal}
          onSubmit={handleComprar}
        />
      )}
    </>
  );
}
