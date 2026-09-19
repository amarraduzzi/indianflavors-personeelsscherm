/**
 * print-ticket.js
 * ------------------
 * Imprime une commande sur l'imprimante de caisse via la boîte de dialogue
 * d'impression du navigateur (window.print). L'imprimante de caisse doit
 * être définie comme IMPRIMANTE PAR DÉFAUT dans Windows, sur le PC où cet
 * écran est ouvert.
 *
 * Utilisation depuis votre propre code :
 *
 *   window.printOrder({
 *     id: "1234",
 *     table: "Table 5",            // optionnel
 *     items: [
 *       { name: "Chicken Tikka Masala", qty: 2, price: 14.50 },
 *       { name: "Pain Naan", qty: 1, price: 3.00 }
 *     ],
 *     total: 32.00,                 // optionnel, sinon calculé automatiquement
 *     note: "Très épicé"            // optionnel
 *   });
 *
 * Pour une impression totalement silencieuse (sans boîte de dialogue) :
 * lancer Chrome avec le paramètre --kiosk-printing, par ex. :
 *   chrome.exe --kiosk-printing --kiosk https://votre-ecran-personnel-url
 */
(function () {
  const PAPER_WIDTH_MM = 80; // remplacer par 58 pour une imprimante à rouleau 58mm

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
    const dateStr = now.toLocaleDateString("fr-FR");
    const timeStr = now.toLocaleTimeString("fr-FR", {
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
          <title>Ticket ${escapeHtml(order.id || "")}</title>
          <style>
            @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body {
              width: ${PAPER_WIDTH_MM}mm;
              margin: 0;
              padding: 6mm 4mm;
              font-family: "Courier New", monospace;
              font-size: 16px;
              font-weight: bold;
              color: #000;
            }
            h1 {
              font-size: 22px;
              font-weight: bold;
              text-align: center;
              margin: 0 0 5px;
            }
            .meta {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 4px 0;
              vertical-align: top;
              font-weight: bold;
            }
            td.qty { width: 12%; }
            td.name { width: 60%; }
            td.price { width: 28%; text-align: right; white-space: nowrap; }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 19px;
              margin-top: 10px;
            }
            .note {
              margin-top: 10px;
              font-size: 14px;
              font-weight: bold;
              font-style: italic;
            }
            .footer {
              text-align: center;
              margin-top: 12px;
              font-size: 14px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Indian Flavors</h1>
          <div class="meta">
            ${dateStr} ${timeStr}${order.id ? " &middot; Ticket #" + escapeHtml(order.id) : ""}
            ${order.table ? "<br/>" + escapeHtml(order.table) : ""}
          </div>
          <hr />
          <table>
            ${rows}
          </table>
          <hr />
          <div class="total-row">
            <span>TOTAL</span>
            <span>${formatPrice(total)}</span>
          </div>
          ${order.note ? `<div class="note">Remarque : ${escapeHtml(order.note)}</div>` : ""}
          <div class="footer">Merci !</div>
        </body>
      </html>`;
  }

  /**
   * Imprime une commande sur l'imprimante par défaut.
   * @param {Object} order
   */
  window.printOrder = function printOrder(order) {
    if (!order || !Array.isArray(order.items)) {
      console.error("printOrder: objet de commande invalide", order);
      return;
    }

    const html = buildReceiptHtml(order);

    // Utilise un iframe invisible plutôt qu'une fenêtre popup, pour que
    // cela fonctionne même si le navigateur bloque les popups.
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
      // On ne retire l'iframe qu'une fois la boîte de dialogue d'impression
      // (ou l'impression silencieuse en --kiosk-printing) traitée.
      setTimeout(function () {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  /**
   * Imprime un document texte brut (utilisé pour les rapports X / Z de
   * la caisse). `lines` est un tableau de chaînes déjà mises en forme
   * (police à chasse fixe).
   * @param {string} title
   * @param {string[]} lines
   */
  window.printPlainDocument = function printPlainDocument(title, lines) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const body = (lines || []).map((l) => escapeHtml(l)).join("\n");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body {
              width: ${PAPER_WIDTH_MM}mm;
              margin: 0;
              padding: 6mm 4mm;
              font-family: "Courier New", monospace;
              font-size: 13px;
              font-weight: bold;
              color: #000;
              white-space: pre-wrap;
            }
            h1 {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              margin: 0 0 4px;
            }
            .meta {
              text-align: center;
              font-size: 12px;
              margin-bottom: 8px;
            }
            hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <h1>Indian Flavors</h1>
          <div class="meta">${dateStr} ${timeStr}</div>
          <hr />
${body}
        </body>
      </html>`;

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
      setTimeout(function () {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };
})();
