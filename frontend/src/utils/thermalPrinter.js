/**
 * Klozer Direct-to-Thermal ESC/POS Kitchen & Cashier Printer Engine
 * Supports driver-free Web Bluetooth API for portable thermal printers (58mm & 80mm),
 * with instant fallback to standard formatted receipt window print.
 */

// ESC/POS Command Constants
const ESC = "\x1B";
const GS = "\x1D";

export const ESC_COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT_ON: `${ESC}!\x10`,
  DOUBLE_WIDTH_ON: `${ESC}!\x20`,
  DOUBLE_BOTH_ON: `${ESC}!\x30`,
  TEXT_NORMAL: `${ESC}!\x00`,
  FEED_AND_CUT: `\n\n\n${GS}V\x42\x00`,
};

/**
 * Format Kitchen / Cashier Ticket string for ESC/POS
 */
export function formatEscPosReceipt(order, { paperWidth = 58, storeName = "Geprek Juara" } = {}) {
  const lineLength = paperWidth === 80 ? 48 : 32;
  const divider = "-".repeat(lineLength) + "\n";
  const doubleDivider = "=".repeat(lineLength) + "\n";

  let out = "";
  out += ESC_COMMANDS.INIT;
  out += ESC_COMMANDS.ALIGN_CENTER;
  out += ESC_COMMANDS.BOLD_ON;
  out += ESC_COMMANDS.DOUBLE_BOTH_ON;
  out += `${storeName.toUpperCase()}\n`;
  out += ESC_COMMANDS.TEXT_NORMAL;
  out += ESC_COMMANDS.BOLD_OFF;
  out += `TIKET DAPUR & REKAP PESANAN\n`;
  out += `WhatsApp Automated Order\n`;
  out += doubleDivider;

  out += ESC_COMMANDS.ALIGN_LEFT;
  out += `No Order : ${order.order_number || order.id || "ORD-001"}\n`;
  out += `Tanggal  : ${new Date(order.created_at || Date.now()).toLocaleString("id-ID")}\n`;
  out += `Customer : ${order.customer_name || "Pelanggan"} (${order.customer_phone || "-"})\n`;
  if (order.address) {
    out += `Alamat   : ${order.address}\n`;
  }
  out += divider;

  // Header Table
  out += ESC_COMMANDS.BOLD_ON;
  if (paperWidth === 80) {
    out += `MENU / ITEM                   QTY        HARGA\n`;
  } else {
    out += `ITEM                 QTY     TOTAL\n`;
  }
  out += ESC_COMMANDS.BOLD_OFF;
  out += divider;

  // Order Items
  const items = order.items || [
    { item_name: "Paket Juara 1 (Ayam Geprek + Nasi + Es Teh)", quantity: 2, subtotal: 44000, unit_price: 22000 },
  ];

  items.forEach((item) => {
    const name = item.item_name || item.name || "Menu";
    const qty = String(item.quantity || 1);
    const subtotal = `Rp ${(Number(item.subtotal || item.unit_price * item.quantity || 0)).toLocaleString("id-ID")}`;

    if (paperWidth === 80) {
      const nameCol = name.padEnd(28).substring(0, 28);
      const qtyCol = qty.padStart(5);
      const subtotalCol = subtotal.padStart(13);
      out += `${nameCol} ${qtyCol}  ${subtotalCol}\n`;
    } else {
      out += `${name}\n`;
      const qtyText = `  ${qty}x @ ${(Number(item.unit_price || 0)).toLocaleString("id-ID")}`;
      const subtotalCol = subtotal.padStart(lineLength - qtyText.length);
      out += `${qtyText}${subtotalCol}\n`;
    }
  });

  out += divider;
  out += ESC_COMMANDS.ALIGN_RIGHT;
  out += `Subtotal : Rp ${(Number(order.subtotal_amount || order.total_amount || 0)).toLocaleString("id-ID")}\n`;
  if (Number(order.shipping_fee) > 0) {
    out += `Ongkir   : Rp ${(Number(order.shipping_fee)).toLocaleString("id-ID")}\n`;
  }
  out += ESC_COMMANDS.BOLD_ON;
  out += ESC_COMMANDS.DOUBLE_HEIGHT_ON;
  out += `TOTAL    : Rp ${(Number(order.total_amount || 0)).toLocaleString("id-ID")}\n`;
  out += ESC_COMMANDS.TEXT_NORMAL;
  out += ESC_COMMANDS.BOLD_OFF;

  out += doubleDivider;
  out += ESC_COMMANDS.ALIGN_CENTER;
  const isPaid = order.status === "paid" || order.payment_status === "paid";
  if (isPaid) {
    out += ESC_COMMANDS.BOLD_ON;
    out += `*** LUNAS (DYNAMIC QRIS) ***\n`;
    out += ESC_COMMANDS.BOLD_OFF;
  } else if (order.payment_method === "cod") {
    out += `*** BAYAR DI TEMPAT (COD) ***\n`;
  } else {
    out += `*** MENUNGGU PEMBAYARAN ***\n`;
  }

  if (order.notes) {
    out += `Catatan: ${order.notes}\n`;
  }
  out += `Powered by Klozer AI Commerce\n`;
  out += ESC_COMMANDS.FEED_AND_CUT;

  return out;
}

/**
 * Print via Web Bluetooth to standard ESC/POS thermal printer
 */
export async function printViaWebBluetooth(order, options = {}) {
  if (typeof navigator === "undefined" || !navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome atau Edge.");
  }

  const receiptContent = formatEscPosReceipt(order, options);
  const encoder = new TextEncoder();
  const data = encoder.encode(receiptContent);

  // Request Bluetooth Device with Serial/Printing Service
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS Service UUID
      "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent TX
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Feasycom Bluetooth Printer
    ],
  });

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  if (!services || services.length === 0) {
    throw new Error("Tidak menemukan layanan pencetakan yang cocok pada printer.");
  }

  let printCharacteristic = null;
  for (const s of services) {
    const chars = await s.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        printCharacteristic = c;
        break;
      }
    }
    if (printCharacteristic) break;
  }

  if (!printCharacteristic) {
    throw new Error("Printer tidak mengizinkan penulisan data cetak.");
  }

  // Send chunks (max 100 bytes per packet for Bluetooth LE MTU stability)
  const chunkSize = 100;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (printCharacteristic.properties.writeWithoutResponse) {
      await printCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await printCharacteristic.writeValue(chunk);
    }
  }

  return { success: true, message: "Pencetakan berhasil dikirim ke printer Bluetooth!" };
}

/**
 * Fallback: Print via Standard Browser Print Window (58mm / 80mm clean thermal receipt)
 */
export function printViaBrowserWindow(order, { paperWidth = 58, storeName = "Geprek Juara" } = {}) {
  const widthMm = paperWidth === 80 ? "80mm" : "58mm";
  const isPaid = order.status === "paid" || order.payment_status === "paid";
  const items = order.items || [
    { item_name: "Paket Juara 1 (Ayam Geprek + Nasi + Es Teh)", quantity: 2, subtotal: 44000, unit_price: 22000 },
  ];

  const printWindow = window.open("", "_blank", `width=400,height=600`);
  if (!printWindow) {
    alert("Pop-up diblokir oleh browser. Harap izinkan pop-up untuk mencetak struk.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk Order #${order.order_number || order.id || "001"}</title>
        <style>
          @page { size: ${widthMm} auto; margin: 2mm; }
          body {
            font-family: 'Courier New', monospace;
            width: ${widthMm};
            margin: 0 auto;
            padding: 4px;
            font-size: 11px;
            color: #000;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .double-divider { border-top: 1px double #000; margin: 6px 0; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .badge-lunas {
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: bold;
            display: inline-block;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="header-title">${storeName.toUpperCase()}</div>
          <div>TIKET DAPUR & REKAP PESANAN</div>
          <div style="font-size: 9.5px;">WhatsApp Automated Order</div>
        </div>

        <div class="double-divider"></div>

        <div>No Order : ${order.order_number || order.id || "ORD-001"}</div>
        <div>Waktu    : ${new Date(order.created_at || Date.now()).toLocaleString("id-ID")}</div>
        <div>Customer : ${order.customer_name || "Pelanggan"} (${order.customer_phone || "-"})</div>
        ${order.address ? `<div>Alamat   : ${order.address}</div>` : ""}

        <div class="divider"></div>

        ${items
          .map(
            (it) => `
          <div>
            <div class="bold">${it.item_name || it.name}</div>
            <div class="item-row">
              <span>${it.quantity}x @ Rp ${(Number(it.unit_price || 0)).toLocaleString("id-ID")}</span>
              <span class="bold">Rp ${(Number(it.subtotal || it.unit_price * it.quantity || 0)).toLocaleString("id-ID")}</span>
            </div>
          </div>
        `
          )
          .join("")}

        <div class="divider"></div>

        <div class="item-row">
          <span>Subtotal:</span>
          <span>Rp ${(Number(order.subtotal_amount || order.total_amount || 0)).toLocaleString("id-ID")}</span>
        </div>
        ${
          Number(order.shipping_fee) > 0
            ? `
          <div class="item-row">
            <span>Ongkir:</span>
            <span>Rp ${(Number(order.shipping_fee)).toLocaleString("id-ID")}</span>
          </div>
        `
            : ""
        }
        <div class="item-row bold" style="font-size: 13px; margin-top: 4px;">
          <span>TOTAL:</span>
          <span>Rp ${(Number(order.total_amount || 0)).toLocaleString("id-ID")}</span>
        </div>

        <div class="double-divider"></div>

        <div class="text-center">
          <div class="badge-lunas">
            ${isPaid ? "*** LUNAS (DYNAMIC QRIS) ***" : order.payment_method === "cod" ? "*** COD (BAYAR DI TEMPAT) ***" : "*** MENUNGGU BAYAR ***"}
          </div>
          ${order.notes ? `<div style="margin-top: 4px;">Catatan: ${order.notes}</div>` : ""}
          <div style="margin-top: 6px; font-size: 9px; color: #555;">Powered by Klozer AI Commerce</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
