/**
 * smart-add.js - Smart Camera Barcode Scanner & Metadata Auto-fetch
 * Supports continuous batch scan mode, Open Library/Google Books fetch,
 * review preview modal, and "Do I own this?" fast retail check mode.
 */

import { getAllBooks, saveBook } from '../db.js';
import { t, isRTL, normalizeArabic } from '../i18n.js';
import { BarcodeScanner, fetchBookMetadataByISBN } from '../utils/barcode.js';

let isContinuousMode = false;
let scannerInstance = null;

export async function renderSmartAddView(container, navigateTo) {
  const allBooks = await getAllBooks();

  container.innerHTML = `
    <div class="view-container" style="max-width: 800px;">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin-bottom: 4px;">⚡ ${t('smartAddTitle')}</h2>
        <p style="font-size: 0.9rem; color: var(--text-muted);">${t('continuousScanHelp')}</p>
      </div>

      <!-- Mode selection cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
        <!-- Card 1: Camera Barcode Scan -->
        <div class="stat-card" style="padding: var(--space-lg);">
          <h3 style="font-size: 1.15rem; color: var(--accent-gold); margin-bottom: 6px;">📷 ${t('barcodeScannerTitle')}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
            Point your mobile camera at the ISBN barcode on the back cover of any book.
          </p>
          <div style="display: flex; gap: var(--space-xs); align-items: center; margin-bottom: var(--space-md);">
            <label style="font-size: 0.85rem; display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="check-continuous-mode" ${isContinuousMode ? 'checked' : ''}>
              <span>${t('continuousScanMode')}</span>
            </label>
          </div>
          <button class="btn btn-primary" id="btn-toggle-camera" style="width: 100%;">
            🎥 ${t('startScanner')}
          </button>
        </div>

        <!-- Card 2: Do I Own This? Quick Check -->
        <div class="stat-card" style="padding: var(--space-lg);">
          <h3 style="font-size: 1.15rem; color: #60a5fa; margin-bottom: 6px;">🔍 ${t('checkOwnershipTitle')}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">
            ${t('checkOwnershipHelp')}
          </p>
          <div style="display: flex; gap: var(--space-xs);">
            <input type="text" id="input-ownership-check" class="form-control" placeholder="Scan or type ISBN / Title...">
            <button class="btn btn-secondary" id="btn-run-ownership-check">${t('search')}</button>
          </div>
          <div id="ownership-result-box" style="margin-top: var(--space-sm); min-height: 24px;"></div>
        </div>
      </div>

      <!-- Live Camera Viewport Area (Initially Hidden) -->
      <div id="camera-scanner-wrapper" style="display: none; margin-bottom: var(--space-lg);">
        <div class="scanner-viewport-box">
          <video id="scanner-video" class="scanner-video" playsinline></video>
          <div class="scanner-reticle"></div>
          <div class="scanner-laser-overlay"></div>
        </div>
        <div style="text-align: center; margin-top: var(--space-sm);">
          <button class="btn btn-secondary btn-sm" id="btn-stop-camera">✕ ${t('stopScanner')}</button>
        </div>
      </div>

      <!-- Manual ISBN Lookup Box -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--card-shadow);">
        <h3 style="font-size: 1.1rem; color: var(--accent-gold); margin-bottom: var(--space-xs);">
          ⌨️ ${t('manualLookupTitle')}
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-md);">
          Fetches covers, descriptions, publishers and authors directly from global library registries.
        </p>
        <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
          <input type="text" id="input-manual-isbn" class="form-control" placeholder="e.g. 9789770921004 or 9780441013593" style="flex: 1; min-width: 220px;">
          <button class="btn btn-primary" id="btn-fetch-manual">
            ${t('lookupBtn')}
          </button>
        </div>
        <div id="lookup-spinner" style="display: none; margin-top: var(--space-md); color: var(--accent-gold); font-size: 0.9rem;">
          ⌛ ${t('searchingApis')}
        </div>
      </div>

      <!-- Metadata Preview / Review Modal Mount -->
      <div id="review-preview-mount"></div>
    </div>
  `;

  // Attach camera toggle
  const btnToggleCamera = container.querySelector('#btn-toggle-camera');
  const btnStopCamera = container.querySelector('#btn-stop-camera');
  const cameraWrapper = container.querySelector('#camera-scanner-wrapper');
  const videoEl = container.querySelector('#scanner-video');
  const checkContinuous = container.querySelector('#check-continuous-mode');

  checkContinuous.addEventListener('change', (e) => {
    isContinuousMode = e.target.checked;
  });

  btnToggleCamera.addEventListener('click', async () => {
    cameraWrapper.style.display = 'block';
    try {
      scannerInstance = new BarcodeScanner(videoEl, async (detectedCode) => {
        // Sound / haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(80);
        handleDetectedISBN(detectedCode);
      });
      await scannerInstance.start();
      btnToggleCamera.style.display = 'none';
    } catch (err) {
      alert('Camera access failed: ' + err.message);
      cameraWrapper.style.display = 'none';
      btnToggleCamera.style.display = 'block';
    }
  });

  btnStopCamera.addEventListener('click', () => {
    if (scannerInstance) {
      scannerInstance.stop();
      scannerInstance = null;
    }
    cameraWrapper.style.display = 'none';
    btnToggleCamera.style.display = 'block';
  });

  // Manual Lookup Button
  const btnFetchManual = container.querySelector('#btn-fetch-manual');
  const inputManualIsbn = container.querySelector('#input-manual-isbn');
  btnFetchManual.addEventListener('click', () => {
    const isbn = inputManualIsbn.value.trim();
    if (isbn) handleDetectedISBN(isbn);
  });
  inputManualIsbn.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const isbn = inputManualIsbn.value.trim();
      if (isbn) handleDetectedISBN(isbn);
    }
  });

  // "Do I Own This?" check button
  const inputOwnership = container.querySelector('#input-ownership-check');
  const btnRunOwnership = container.querySelector('#btn-run-ownership-check');
  const ownershipResultBox = container.querySelector('#ownership-result-box');

  const checkOwnership = () => {
    const q = inputOwnership.value.trim();
    if (!q) return;

    const normQ = normalizeArabic(q);
    const cleanIsbn = q.replace(/[^0-9X]/gi, '');

    const found = allBooks.find(b => {
      if (cleanIsbn && (b.isbn || '').replace(/[^0-9X]/gi, '') === cleanIsbn) return true;
      if (normQ && normalizeArabic(b.title).includes(normQ)) return true;
      return false;
    });

    if (found) {
      ownershipResultBox.innerHTML = `
        <div style="padding: 8px 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: var(--radius-md); color: #22c55e; font-size: 0.85rem;">
          ✓ <strong>${t('ownershipYes')}</strong><br>
          "${found.title}" by ${(found.authors || []).join(', ')} (${found.location?.room || 'Library'} • ${found.location?.cabinet || ''})
        </div>
      `;
    } else {
      ownershipResultBox.innerHTML = `
        <div style="padding: 8px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: var(--radius-md); color: #ef4444; font-size: 0.85rem;">
          ✕ <strong>${t('ownershipNo')}</strong>
        </div>
      `;
    }
  };

  btnRunOwnership.addEventListener('click', checkOwnership);
  inputOwnership.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkOwnership();
  });

  // Handle Detected ISBN
  async function handleDetectedISBN(isbn) {
    const spinner = container.querySelector('#lookup-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
      const metadata = await fetchBookMetadataByISBN(isbn);
      if (spinner) spinner.style.display = 'none';

      // Check if duplicate
      const duplicate = allBooks.find(b => (b.isbn || '').replace(/[^0-9X]/gi, '') === metadata.isbn);
      showReviewModal(metadata, duplicate);
    } catch (err) {
      if (spinner) spinner.style.display = 'none';
      // If offline or not found, navigate to manual form prefilled with ISBN!
      if (confirm(`Book metadata could not be fetched automatically: ${err.message}.\n\nWould you like to open the manual entry form with this ISBN prefilled?`)) {
        if (scannerInstance) scannerInstance.stop();
        navigateTo('book-form', { prefill: { isbn } });
      }
    }
  }

  function showReviewModal(metadata, duplicate) {
    const mount = container.querySelector('#review-preview-mount');
    mount.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">🎉 ${t('foundBookPreview')}</h3>
            <button class="btn btn-sm btn-icon" id="btn-close-review">✕</button>
          </div>
          <div class="modal-body">
            ${duplicate ? `
              <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: var(--radius-md); padding: var(--space-sm); margin-bottom: var(--space-md); font-size: 0.85rem; color: #f59e0b;">
                ⚠️ <strong>${t('duplicateDetectedTitle')}:</strong> ${t('duplicateDetectedMsg', { title: duplicate.title, author: (duplicate.authors || []).join(', ') })}
              </div>
            ` : ''}

            <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
              <div style="width: 100px; height: 145px; border-radius: 4px; overflow: hidden; background: #000; flex-shrink: 0;">
                ${metadata.coverImage ? `<img src="${metadata.coverImage}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">No Cover</div>'}
              </div>
              <div style="flex: 1; min-width: 200px;">
                <h4 style="font-size: 1.15rem; margin-bottom: 2px;">${escapeHtml(metadata.title)}</h4>
                <p style="font-size: 0.85rem; color: var(--accent-gold); margin-bottom: 6px;">${escapeHtml((metadata.authors || []).join(', '))}</p>
                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 2px;">
                  <span>ISBN: ${escapeHtml(metadata.isbn)}</span>
                  <span>${escapeHtml(metadata.publisher)} (${escapeHtml(metadata.publicationYear)})</span>
                  ${metadata.pageCount ? `<span>${escapeHtml(metadata.pageCount)} pages</span>` : ''}
                </div>
              </div>
            </div>

            ${metadata.description ? `
              <div style="margin-top: var(--space-md); font-size: 0.85rem; color: var(--text-secondary); max-height: 100px; overflow-y: auto; background: var(--bg-secondary); padding: var(--space-xs); border-radius: var(--radius-sm);">
                ${escapeHtml(metadata.description)}
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" id="btn-edit-more-review">
              ✏️ ${t('edit')} ${t('details')}
            </button>
            <button class="btn btn-primary btn-sm" id="btn-confirm-add-library">
              ✓ ${t('saveToLibrary')}
            </button>
          </div>
        </div>
      </div>
    `;

    mount.querySelector('#btn-close-review').addEventListener('click', () => {
      mount.innerHTML = '';
    });

    mount.querySelector('#btn-edit-more-review').addEventListener('click', () => {
      if (scannerInstance) scannerInstance.stop();
      mount.innerHTML = '';
      navigateTo('book-form', { prefill: metadata });
    });

    mount.querySelector('#btn-confirm-add-library').addEventListener('click', async () => {
      const newBook = {
        title: metadata.title,
        subtitle: metadata.subtitle || '',
        authors: metadata.authors || [],
        publisher: metadata.publisher || '',
        publicationYear: metadata.publicationYear || '',
        isbn: metadata.isbn,
        language: metadata.language || 'en',
        pageCount: metadata.pageCount,
        coverImage: metadata.coverImage || '',
        category: metadata.category || 'General',
        review: metadata.description || ''
      };
      await saveBook(newBook);
      allBooks.push(newBook);
      mount.innerHTML = '';

      if (isContinuousMode) {
        // Stay in continuous scanning mode
        alert(`Saved '${metadata.title}'! Ready for next book.`);
      } else {
        if (scannerInstance) scannerInstance.stop();
        navigateTo('library');
      }
    });
  }
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
