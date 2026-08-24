# 🤖 Reglas y Memoria del Proyecto: IA ENTRE PANES

Este archivo define las reglas de negocio, contexto general y especificaciones operativas para el asistente **Antigravity** y los agentes de IA del proyecto.

---

## 🎯 Objetivo General y Configuración de Negocio
Automatizar la rotisería **"Entre Panes"**.
- **Número oficial de WhatsApp**: `+54 9 3582 435386` / `54935582435386`.
- **URL en Vivo (Vercel)**: `https://ia-entre-panes.vercel.app`.

---

## 👥 Módulos del Sistema

1. **OrderAgent (Bot de WhatsApp)**
   - Responde inmediatamente a cualquier mensaje entrante con el saludo oficial y el link `https://ia-entre-panes.vercel.app`.

2. **Catálogo Web de la Rotisería (`src/app/page.tsx`)**
   - Muestra productos con controles directos `- 0 +` por tarjeta.
   - Suma en vivo el total.
   - En el checkout, el campo de celular incluye `+54 ` pre-configurado por defecto para evitar errores.
   - Al hacer clic en "COMPRAR", genera el recibo y lo redirige a WhatsApp hacia el número oficial de la rotisería (`+54 9 3582 435386`).

3. **Vista de Recibos para Cocina (`src/app/cocina/page.tsx`)**
   - El personal del local observa los recibos de comandas entrantes y los marca como despachados.
