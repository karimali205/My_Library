/**
 * wishlist.js - Books Wishlist & Procurement Queue
 * Tracks desired books, priority, estimated price, and allows
 * instant "Move to Library" when acquired.
 */

import { getWishlist, saveWishlistItem, deleteWishlistItem, saveBook } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';

export async function renderWishlistView(container, navigateTo) {
  const wishlist = await getWishlist();

  container.innerHTML = `
    <div class="view-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-sm);">
        <div>
          <h2 style="color: var(--accent-gold); margin: 0;">✨ ${t('wishlistTitle')}</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            ${formatNumber(wishlist.length)} books in wishlist
          </p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-add-wishlist">
          + ${t('addToWishlist')}
        </button>
      </div>

      ${wishlist.length === 0 ? `
        <div style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: var(--space-sm);">🎁</div>
          <h3>Your wishlist is currently empty</h3>
          <p>Keep track of books you desire before your next visit to the bookstore!</p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md);">
          ${wishlist.map(item => `
            <div class="stat-card" style="padding: var(--space-md); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span class="badge ${item.priority === 'high' ? 'badge-reading' : ''}">
                    ${item.priority ? t('priority' + capitalize(item.priority)) : t('priorityMedium')}
                  </span>
                  ${item.estimatedPrice ? `<span style="font-size: 0.85rem; font-weight: bold; color: var(--accent-gold);">${item.estimatedPrice} ${item.currency || 'USD'}</span>` : ''}
                </div>
                <h4 style="font-size: 1.05rem; margin-bottom: 2px;">${escapeHtml(item.title)}</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">${escapeHtml(item.author || '')}</p>
                ${item.notes ? `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-bottom: var(--space-sm);">${escapeHtml(item.notes)}</p>` : ''}
              </div>

              <div style="display: flex; gap: var(--space-xs); margin-top: var(--space-md); border-top: 1px solid var(--border-color-subtle); padding-top: var(--space-xs);">
                <button class="btn btn-sm btn-brass btn-move-library" data-wish-id="${item.id}" style="flex: 1;">
                  📚 ${t('moveToLibrary')}
                </button>
                <button class="btn btn-sm btn-icon btn-del-wish" data-wish-id="${item.id}" style="color: #ef4444;" title="${t('delete')}">
                  🗑️
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // Add to wishlist prompt
  container.querySelector('#btn-add-wishlist').addEventListener('click', async () => {
    const title = prompt('Book Title:');
    if (!title) return;
    const author = prompt('Author:') || '';
    const price = prompt('Estimated Price (optional):') || '';
    const priority = prompt('Priority (high, medium, low):', 'high') || 'medium';

    await saveWishlistItem({
      title: title.trim(),
      author: author.trim(),
      estimatedPrice: parseFloat(price) || null,
      priority: priority.toLowerCase(),
      currency: 'USD',
      notes: ''
    });
    renderWishlistView(container, navigateTo);
  });

  // Move to library
  container.querySelectorAll('.btn-move-library').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.wishId;
      const item = wishlist.find(w => w.id === id);
      if (item) {
        await saveBook({
          title: item.title,
          authors: item.author ? [item.author] : [],
          purchasePrice: item.estimatedPrice,
          currency: item.currency || 'USD'
        });
        await deleteWishlistItem(id);
        alert(t('savedSuccessfully'));
        navigateTo('library');
      }
    });
  });

  // Delete from wishlist
  container.querySelectorAll('.btn-del-wish').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm(t('delete') + '?')) {
        await deleteWishlistItem(btn.dataset.wishId);
        renderWishlistView(container, navigateTo);
      }
    });
  });
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
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
