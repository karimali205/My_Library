/**
 * inventory.js - Physical Shelf Audit & Verification Mode
 * Walk through shelves, verify physical books in place by tap or barcode scan,
 * and generate a reconciliation report of missing or misplaced volumes.
 */

import { getAllBooks } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';

let auditShelf = '';
let verifiedBookIds = new Set();
let isAuditing = false;

export async function renderInventoryView(container, navigateTo) {
  const books = await getAllBooks();

  // Find all distinct physical locations (Room > Cabinet > Shelf)
  const shelfLocations = Array.from(new Set(books.map(b => {
    return [b.location?.room, b.location?.cabinet, b.location?.shelf].filter(Boolean).join(' > ');
  }))).sort();

  function render() {
    if (!isAuditing) {
      container.innerHTML = `
        <div class="view-container" style="max-width: 700px;">
          <div style="margin-bottom: var(--space-lg);">
            <h2 style="color: var(--accent-gold); margin: 0;">📋 ${t('inventoryTitle')}</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
              ${t('inventoryHelp')}
            </p>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-xl); box-shadow: var(--card-shadow);">
            <div class="form-group">
              <label class="form-label">${t('selectAuditShelf')}</label>
              <select id="select-audit-target" class="form-control">
                <option value="ALL">🌐 All Shelves in Library (${formatNumber(books.length)} books)</option>
                ${shelfLocations.map(loc => `
                  <option value="${escapeHtml(loc)}" ${auditShelf === loc ? 'selected' : ''}>${escapeHtml(loc)}</option>
                `).join('')}
              </select>
            </div>

            <button class="btn btn-primary" id="btn-begin-audit" style="width: 100%; margin-top: var(--space-md);">
              🚀 ${t('startAudit')}
            </button>
          </div>
        </div>
      `;

      container.querySelector('#btn-begin-audit').addEventListener('click', () => {
        const sel = container.querySelector('#select-audit-target');
        auditShelf = sel.value;
        verifiedBookIds.clear();
        isAuditing = true;
        render();
      });
      return;
    }

    // Currently Auditing Mode
    const targetBooks = auditShelf === 'ALL'
      ? books
      : books.filter(b => [b.location?.room, b.location?.cabinet, b.location?.shelf].filter(Boolean).join(' > ') === auditShelf);

    const verifiedCount = verifiedBookIds.size;
    const pendingCount = targetBooks.length - verifiedCount;

    container.innerHTML = `
      <div class="view-container" style="max-width: 800px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); flex-wrap: wrap; gap: var(--space-xs);">
          <div>
            <h2 style="color: var(--accent-gold); margin: 0;">🔍 Shelf Audit: ${escapeHtml(auditShelf)}</h2>
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              ${t('verifiedBooks')}: ${formatNumber(verifiedCount)} / ${formatNumber(targetBooks.length)}
            </span>
          </div>
          <button class="btn btn-sm btn-brass" id="btn-finish-audit">
            🏁 ${t('finishAudit')}
          </button>
        </div>

        <!-- Progress meter -->
        <div style="width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; margin-bottom: var(--space-lg);">
          <div style="height: 100%; width: ${(verifiedCount / (targetBooks.length || 1)) * 100}%; background: #22c55e;"></div>
        </div>

        <!-- Books Checklist -->
        <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
          ${targetBooks.map(b => {
            const isVerified = verifiedBookIds.has(b.id);
            return `
              <div class="stat-card" style="padding: var(--space-sm); display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); background: ${isVerified ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-surface)'}; border-color: ${isVerified ? '#22c55e' : 'var(--border-color)'};">
                <div>
                  <h4 style="font-size: 0.95rem; margin: 0; text-decoration: ${isVerified ? 'line-through' : 'none'};">${escapeHtml(b.title)}</h4>
                  <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">
                    ${(b.authors || []).join(', ')} ${b.isbn ? `• ISBN: ${b.isbn}` : ''}
                  </p>
                </div>
                <button class="btn btn-sm ${isVerified ? 'btn-secondary' : 'btn-primary'} btn-toggle-verify" data-book-id="${b.id}">
                  ${isVerified ? '✓ Verified' : 'Mark Verified'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-toggle-verify').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.bookId;
        if (verifiedBookIds.has(id)) verifiedBookIds.delete(id);
        else verifiedBookIds.add(id);
        render();
      });
    });

    container.querySelector('#btn-finish-audit').addEventListener('click', () => {
      const missingBooks = targetBooks.filter(b => !verifiedBookIds.has(b.id));
      alert(`Audit Complete!\n\nVerified: ${verifiedCount} books\nMissing / Unaccounted: ${missingBooks.length} books.`);
      isAuditing = false;
      render();
    });
  }

  render();
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
