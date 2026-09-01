/**
 * print-kassabon.js
 * ------------------
 * Print een bestelling naar de kassaprinter via het printdialoogvenster
 * van de browser (window.print). De kassaprinter moet als STANDAARDPRINTER
 * ingesteld staan in Windows op de pc waar dit scherm open staat.
 *
 * Gebruik vanuit je eigen code:
 *
 *   window.printOrder({
 *     id: "1234",
 *     table: "Tafel 5",            // optioneel
 *     items: [
 *       { name: "Chicken Tikka Masala", qty: 2, price: 14.50 },
 *       { name: "Naan brood", qty: 1, price: 3.00 }
 *     ],
 *     total: 32.00,                 // optioneel, wordt anders berekend
 *     note: "Extra pittig"          // optioneel
 *   });
 *
 * Voor volledig stil printen (geen printdialoogvenster):
 * start Chrome met de vlag --kiosk-printing, bv.:
 *   chrome.exe --kiosk-printing --kiosk https://jouw-personeelsscherm-url
 */
(function () {
  const PAPER_WIDTH_MM = 80; // wijzig naar 58 als je een 58mm-rolprinter hebt

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatPrice(n) {
    return Number(n || 0).toFixed(2).replace(".", ",") + " DH";
  }

  function buildReceiptHtml(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const computedTotal = items.reduce(
      (sum, it) => sum + (Number(it.qty) || 1) * (Number(it.price) || 0),
      0
    );
    const total = order.total != null ? order.total : computedTotal;
    const now = new Date();
    const dateStr = now.toLocaleDateString("nl-NL");
    const timeStr = now.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const rows = items
      .map((it) => {
        const qty = it.qty || 1;
        const lineTotal = (Number(it.qty) || 1) * (Number(it.price) || 0);
        return `
          <tr>
            <td class="qty">${escapeHtml(qty)}x</td>
            <td class="name">${escapeHtml(it.name || "")}</td>
            <td class="price">${formatPrice(lineTotal)}</td>
          </tr>`;
      })
      .join("");

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bon ${escapeHtml(order.id || "")}</title>
          <style>
            @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body {
              width: ${PAPER_WIDTH_MM}mm;
              margin: 0;
              padding: 6mm 4mm;
              font-family: "Courier New", monospace;
              font-size: 12px;
              color: #000;
            }
            h1 {
              font-size: 15px;
              text-align: center;
              margin: 0 0 4px;
            }
            .meta {
              text-align: center;
              font-size: 11px;
              margin-bottom: 8px;
            }
            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 2px 0;
              vertical-align: top;
            }
            td.qty { width: 12%; }
            td.name { width: 60%; }
            td.price { width: 28%; text-align: right; white-space: nowrap; }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 14px;
              margin-top: 8px;
            }
            .note {
              margin-top: 8px;
              font-size: 11px;
              font-style: italic;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <h1>Indian Flavors</h1>
          <div class="meta">
            ${dateStr} ${timeStr}${order.id ? " &middot; Bon #" + escapeHtml(order.id) : ""}
            ${order.table ? "<br/>" + escapeHtml(order.table) : ""}
          </div>
          <hr />
          <table>
            ${rows}
          </table>
          <hr />
          <div class="total-row">
            <span>TOTAAL</span>
            <span>${formatPrice(total)}</span>
          </div>
          ${order.note ? `<div class="note">Opmerking: ${escapeHtml(order.note)}</div>` : ""}
          <div class="footer">Bedankt!</div>
        </body>
      </html>`;
  }

  /**
   * Print een bestelling naar de standaardprinter.
   * @param {Object} order
   */
  window.printOrder = function printOrder(order) {
    if (!order || !Array.isArray(order.items)) {
      console.error("printOrder: ongeldig order-object", order);
      return;
    }

    const html = buildReceiptHtml(order);

    // Onzichtbaar iframe gebruiken i.p.v. een popup-venster, zodat
    // dit werkt ook als de browser popups blokkeert.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Iframe pas verwijderen nadat het printdialoogvenster (of de
      // stille print bij --kiosk-printing) is afgehandeld.
      setTimeout(function () {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };
})();
