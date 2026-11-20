/**
 * print.js - Printing engine for spine/shelf labels and formatted book catalogs
 */

import { generateQRCodeSVG } from './qrcode.js';

/**
 * Print individual book or shelf QR labels
 */
export function printBookLabels(books, labelSize = 'medium') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print labels');
    return;
  }

  const isRtl = document.documentElement.dir === 'rtl';

  const labelsHtml = books.map(book => {
    const qrSvg = generateQRCodeSVG(book.isbn || book.id, 90);
    const author = (book.authors && book.authors[0]) || '';
    const loc = [book.location?.cabinet, book.location?.shelf].filter(Boolean).join(' • ');

    return `
      <div class="print-label label-${labelSize}">
        <div class="label-qr">${qrSvg}</div>
        <div class="label-info">
          <div class="label-title">${escapeHtml(book.title)}</div>
          <div class="label-author">${escapeHtml(author)}</div>
          <div class="label-meta">
            ${book.isbn ? `<span class="label-isbn">ISBN: ${escapeHtml(book.isbn)}</span>` : ''}
            ${loc ? `<span class="label-loc">${escapeHtml(loc)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>Print Labels - My Library</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 10mm;
          color: #111;
        }
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(65mm, 1fr));
          gap: 5mm;
        }
        .print-label {
          border: 1px dashed #777;
          border-radius: 4px;
          padding: 3mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          page-break-inside: avoid;
          background: #fff;
        }
        .label-qr svg {
          width: 22mm;
          height: 22mm;
        }
        .label-info {
          flex: 1;
          min-width: 0;
          font-size: 8pt;
          line-height: 1.25;
        }
        .label-title {
          font-weight: bold;
          font-size: 9.5pt;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .label-author {
          color: #444;
          margin-top: 1mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .label-meta {
          margin-top: 2mm;
          font-size: 7pt;
          color: #666;
          display: flex;
          flex-direction: column;
        }
        @media print {
          body { padding: 0; }
          .print-label { border: 1px solid #ccc; }
        }
      </style>
    </head>
    <body>
      <div class="labels-grid">
        ${labelsHtml}
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.close();
          }, 350);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Print formatted library catalog
 */
export function printCatalog(books, title = 'Library Catalog') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print');
    return;
  }

  const isRtl = document.documentElement.dir === 'rtl';

  const rowsHtml = books.map((b, i) => `
    <tr>
      <td style="text-align: center; width: 35px;">${i + 1}</td>
      <td><strong>${escapeHtml(b.title)}</strong>${b.subtitle ? `<br><small>${escapeHtml(b.subtitle)}</small>` : ''}</td>
      <td>${escapeHtml((b.authors || []).join(', '))}</td>
      <td>${escapeHtml(b.publisher || '')} (${escapeHtml(b.publicationYear || '')})</td>
      <td>${escapeHtml(b.category || '')}</td>
      <td>${escapeHtml([b.location?.room, b.location?.cabinet, b.location?.shelf].filter(Boolean).join(' / '))}</td>
      <td>${escapeHtml(b.status || '')}</td>
      <td style="text-align: center;">${b.rating ? '★ ' + b.rating : '-'}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 15mm;
          color: #1a1a1a;
          line-height: 1.4;
        }
        .catalog-header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .catalog-header h1 { margin: 0 0 4px 0; font-size: 20pt; }
        .catalog-header p { margin: 0; color: #555; font-size: 10pt; }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px 8px;
          text-align: ${isRtl ? 'right' : 'left'};
        }
        th {
          background-color: #f2f2f2;
          font-weight: 600;
        }
        tr:nth-child(even) { background-color: #fafafa; }
        @media print {
          body { margin: 5mm; }
          th { background-color: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="catalog-header">
        <h1>${escapeHtml(title)}</h1>
        <p>Total Books: ${books.length} | Date: ${new Date().toLocaleDateString()}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Author(s)</th>
            <th>Publisher (Year)</th>
            <th>Category</th>
            <th>Location</th>
            <th>Status</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.close();
          }, 350);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
