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

      <main className="grow w-full max-w-container-max mx-auto px-5 md:px-16 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="mb-8 md:mb-12">
          <h2 className="font-headline-md text-3xl font-bold text-on-surface mb-2">Nuestro Menú</h2>
          <p className="font-body-md text-on-surface-variant text-base md:text-lg">Los mejores sándwiches y lomos de la ciudad, preparados en el momento.</p>
        </div>

        {/* Bento Grid / List Hybrid for Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-24">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={quantities[product.id] || 0}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          ))}
        </div>
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
