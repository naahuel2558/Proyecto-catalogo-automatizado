import React from 'react';

interface CheckoutModalProps {
  totalPrice: number;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  deliveryMethod: 'delivery' | 'pickup';
  setDeliveryMethod: (val: 'delivery' | 'pickup') => void;
  orderDetails: string;
  setOrderDetails: (val: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (val: string) => void;
  isSending: boolean;
  orderCompleted: { id: string; phone: string; whatsappUrl: string } | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CheckoutModal({
  totalPrice,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  deliveryMethod,
  setDeliveryMethod,
  orderDetails,
  setOrderDetails,
  deliveryAddress,
  setDeliveryAddress,
  isSending,
  orderCompleted,
  onClose,
  onSubmit,
}: CheckoutModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
          <div>
            <h2 className="font-headline-md text-lg md:text-xl text-on-surface">
              {orderCompleted ? '¡Pedido registrado!' : 'Finalizar Pedido'}
            </h2>
            {!orderCompleted && (
              <p className="font-label-sm text-xs text-primary font-bold mt-0.5">
                Total a Pagar: ${totalPrice.toLocaleString('es-AR')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {orderCompleted ? (
          /* Vista de confirmación */
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 bg-tertiary-fixed text-tertiary rounded-full flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>

            <div>
              <h3 className="font-headline-sm text-base text-on-surface">
                Pedido listo para enviar
              </h3>
              <p className="font-body-md text-xs text-on-surface-variant mt-1 leading-relaxed">
                Registramos el pedido <strong>{orderCompleted.id}</strong>. Abrí WhatsApp para enviarlo a Entre Panes; quedará pendiente de confirmación hasta que el negocio lo reciba.
              </p>
              <p className="font-label-md text-sm font-bold text-primary mt-2 bg-primary-fixed-dim/20 py-1.5 rounded-lg border border-primary-fixed-dim/60 inline-block px-3">
                {orderCompleted.phone}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <a
                href={orderCompleted.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-surface-container hover:bg-surface-variant text-on-surface font-label-md py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-outline-variant/50"
              >
                <span className="material-symbols-outlined text-tertiary text-base">send</span>
                <span>Abrir WhatsApp manualmente (Opcional)</span>
              </a>

              <button
                onClick={onClose}
                className="w-full bg-primary-container hover:bg-primary text-on-primary font-label-md py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Volver al Menú
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de compra */
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-3">
              {/* Selector Delivery / Retiro */}
              <div className="flex gap-3 mb-2">
                <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl border cursor-pointer transition-all ${deliveryMethod === 'delivery' ? 'bg-primary-container border-primary text-on-primary-container shadow-sm' : 'bg-surface-container-lowest border-outline-variant/60 text-on-surface-variant hover:bg-surface-container'}`}>
                  <input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === 'delivery'} onChange={() => setDeliveryMethod('delivery')} className="hidden" />
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                  <span className="font-label-md text-sm">Delivery</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl border cursor-pointer transition-all ${deliveryMethod === 'pickup' ? 'bg-primary-container border-primary text-on-primary-container shadow-sm' : 'bg-surface-container-lowest border-outline-variant/60 text-on-surface-variant hover:bg-surface-container'}`}>
                  <input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} className="hidden" />
                  <span className="material-symbols-outlined text-[20px]">storefront</span>
                  <span className="font-label-md text-sm">Retiro local</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-label-md text-on-surface-variant mb-1">Tu Nombre</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-label-md text-on-surface-variant mb-1">
                  Celular de contacto <span className="text-primary">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('+54')) setCustomerPhone(val);
                    else if (val.startsWith('+')) setCustomerPhone('+54 ' + val.substring(1));
                    else setCustomerPhone('+54 ' + val);
                  }}
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-sm font-bold text-primary focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="+54 9 358 1234567"
                />
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Tu recibo será enviado por WhatsApp a este número automáticamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-label-md text-on-surface-variant mb-1">Detalles del pedido (Opcional)</label>
                <textarea
                  rows={2}
                  value={orderDetails}
                  onChange={(e) => setOrderDetails(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                  placeholder="Ej. Sin tomate / Mayonesa aparte"
                ></textarea>
              </div>

              {deliveryMethod === 'delivery' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-label-md text-on-surface-variant mb-1">Detalles donde enviarlo <span className="text-primary">*</span></label>
                  <textarea
                    required
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                    placeholder="Ej. Calle Falsa 123, Casa con rejas negras"
                  ></textarea>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSending}
              className={`w-full font-label-md py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md ${
                isSending
                  ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
                  : 'bg-primary-container hover:bg-primary text-on-primary cursor-pointer active:scale-95'
              }`}
            >
              {isSending ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  <span>Enviando Recibo...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  <span>Confirmar Pedido</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
