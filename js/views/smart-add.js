/**
 * smart-add.js - Smart Camera Barcode Scanner & Multi-Registry Book Search
 * Supports continuous batch scan, Open Library Search & Google Books fallback,
 * Arabic-Indic numeral normalization, multiple editions selection, and prefilled manual entry.
 */

import { getAllBooks, saveBook } from '../db.js';
import { t, isRTL, normalizeArabic } from '../i18n.js';
import { BarcodeScanner, searchBookCatalog, normalizeBarcodeDigits } from '../utils/barcode.js';

let isContinuousMode = false;
let scannerInstance = null;

export async function renderSmartAddView(container, navigateTo) {
  const allBooks = await getAllBooks();

  container.innerHTML = `
    <div class="view-container" style="max-width: 850px;">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin-bottom: 4px;">⚡ ${t('smartAddTitle')}</h2>
        <p style="font-size: 0.9rem; color: var(--text-muted);">${t('continuousScanHelp')}</p>
      </div>

      <!-- Mode selection cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
        <!-- Card 1: Camera Barcode Scan -->
        <div class="stat-card" style="padding: var(--space-lg);">
          <h3 style="font-size: 1.15rem; color: var(--accent-gold); margin-bottom: 6px;">📷 ${t('barcodeScannerTitle')}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">
            وجّه كاميرا الهاتف أو اللابتوب نحو الباركود (EAN-13) في ظهر الكتاب.
          </p>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: var(--space-md); line-height: 1.4;">
            💡 <em>نصيحة: كاميرات الهواتف تدعم التركيز التلقائي الأسرع. على اللابتوب ضع الباركود على مسافة 15 سم بإضاءة جيدة.</em>
          </div>
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
            <input type="text" id="input-ownership-check" class="form-control" placeholder="اكتب الردمك أو اسم الكتاب...">
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
        <div style="text-align: center; margin-top: var(--space-sm); display: flex; justify-content: center; gap: var(--space-sm);">
          <button class="btn btn-secondary btn-sm" id="btn-stop-camera">✕ ${t('stopScanner')}</button>
        </div>
      </div>

      <!-- Universal Search / ISBN Lookup Box -->
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--card-shadow);">
        <h3 style="font-size: 1.15rem; color: var(--accent-gold); margin-bottom: var(--space-xs);">
          ⌨️ البحث بالردمك (ISBN) أو عنوان الكتاب أو المؤلف
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-md);">
          يدعم الأرقام الإنجليزية والعربية (مثل: 9789770928171 أو ٩٧٨٩٧٧٠٩٢٨١٧١)، أو اكتب اسم الكتاب (مثل: يوتوبيا، شآبيب، 1984).
        </p>
        
        <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
          <input type="text" id="input-manual-isbn" class="form-control" placeholder="أدخل رقم الردمك أو عنوان الكتاب..." style="flex: 1; min-width: 240px;">
          <button class="btn btn-primary" id="btn-fetch-manual">
            🔍 ${t('lookupBtn')}
          </button>
        </div>

        <div id="lookup-spinner" style="display: none; margin-top: var(--space-md); color: var(--accent-gold); font-size: 0.9rem;">
          ⌛ جارٍ البحث في فهارس Open Library و Google Books...
        </div>

        <!-- Search Results Multi-List Mount -->
        <div id="search-results-list" style="margin-top: var(--space-md); display: none;"></div>
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
        if (navigator.vibrate) navigator.vibrate(80);
        handleSearchOrISBN(detectedCode);
      });
      await scannerInstance.start();
      btnToggleCamera.style.display = 'none';
    } catch (err) {
      alert('تعذر فتح الكاميرا: ' + err.message + '\nيمكنك كتابة رقم الردمك أو عنوان الكتاب في خانة البحث أدناه.');
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
    const q = inputManualIsbn.value.trim();
    if (q) handleSearchOrISBN(q);
  });
  inputManualIsbn.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = inputManualIsbn.value.trim();
      if (q) handleSearchOrISBN(q);
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
    const cleanIsbn = normalizeBarcodeDigits(q);

    const found = allBooks.find(b => {
      const bIsbn = normalizeBarcodeDigits(b.isbn || '');
      if (cleanIsbn && bIsbn === cleanIsbn) return true;
      if (normQ && normalizeArabic(b.title).includes(normQ)) return true;
      return false;
    });

    if (found) {
      ownershipResultBox.innerHTML = `
        <div style="padding: 8px 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: var(--radius-md); color: #22c55e; font-size: 0.85rem;">
          ✓ <strong>${t('ownershipYes')}</strong><br>
          "${found.title}" للمؤلف ${(found.authors || []).join(', ')} (${found.location?.room || 'المكتبة'} • ${found.location?.cabinet || ''})
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

  // Handle Search Query or ISBN
  async function handleSearchOrISBN(rawQuery) {
    const spinner = container.querySelector('#lookup-spinner');
    const resultsContainer = container.querySelector('#search-results-list');
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';

    if (spinner) spinner.style.display = 'block';

    try {
      const booksFound = await searchBookCatalog(rawQuery);
      if (spinner) spinner.style.display = 'none';

      if (booksFound.length === 1) {
        // Single exact match -> open review modal
        const book = booksFound[0];
        const duplicate = allBooks.find(b => {
          const bIsbn = normalizeBarcodeDigits(b.isbn || '');
          const queryIsbn = normalizeBarcodeDigits(book.isbn || '');
          return (queryIsbn && bIsbn === queryIsbn) || normalizeArabic(b.title) === normalizeArabic(book.title);
        });
        showReviewModal(book, duplicate);
      } else if (booksFound.length > 1) {
        // Multiple matches -> show list so user can choose
        renderMultipleResults(booksFound, rawQuery);
      } else {
        // 0 matches found online
        renderNoResultsFallback(rawQuery);
      }
    } catch (err) {
      if (spinner) spinner.style.display = 'none';
      renderNoResultsFallback(rawQuery, err.message);
    }
  }

  function renderMultipleResults(booksList, rawQuery) {
    const listEl = container.querySelector('#search-results-list');
    listEl.style.display = 'block';
    listEl.innerHTML = `
      <div style="border-top: 1px solid var(--border-color); padding-top: var(--space-md);">
        <h4 style="color: var(--accent-gold); margin-bottom: var(--space-sm);">
          📚 تم العثور على (${booksList.length}) طبعات / نتائج. اختر الكتاب المطلوب:
        </h4>
        <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
          ${booksList.map((b, idx) => `
            <div class="stat-card" style="padding: var(--space-sm); display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); cursor: pointer;" data-result-idx="${idx}">
              <div style="display: flex; gap: var(--space-sm); align-items: center; min-width: 0;">
                <div style="width: 44px; height: 62px; flex-shrink: 0; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                  ${b.coverImage ? `<img src="${b.coverImage}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.2rem;">📖</div>'}
                </div>
                <div style="min-width: 0;">
                  <h4 style="font-size: 0.95rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(b.title)}</h4>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0 0;">
                    ${escapeHtml((b.authors || []).join(', '))} ${b.publicationYear ? `(${b.publicationYear})` : ''} ${b.publisher ? `• ${escapeHtml(b.publisher)}` : ''}
                  </p>
                </div>
              </div>
              <button class="btn btn-sm btn-brass" style="flex-shrink: 0;">
                اختيار هذا الكتاب ✓
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    listEl.querySelectorAll('[data-result-idx]').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.resultIdx, 10);
        const selected = booksList[idx];
        const duplicate = allBooks.find(b => {
          const bIsbn = normalizeBarcodeDigits(b.isbn || '');
          const sIsbn = normalizeBarcodeDigits(selected.isbn || '');
          return (sIsbn && bIsbn === sIsbn) || normalizeArabic(b.title) === normalizeArabic(selected.title);
        });
        showReviewModal(selected, duplicate);
      });
    });
  }

  function renderNoResultsFallback(rawQuery, errorMsg = '') {
    const listEl = container.querySelector('#search-results-list');
    listEl.style.display = 'block';
    
    const cleanIsbn = normalizeBarcodeDigits(rawQuery);
    const isIsbn = /^(\d{10}|\d{13})$/.test(cleanIsbn);

    listEl.innerHTML = `
      <div style="border-top: 1px solid var(--border-color); padding-top: var(--space-md);">
        <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid #f59e0b; border-radius: var(--radius-md); padding: var(--space-md); color: #f59e0b;">
          <strong>ℹ️ لم يتم العثور على بيانات تلقائية لهذا البحث في الفهارس العالمية المفتوحة.</strong>
          <p style="font-size: 0.85rem; color: var(--text-primary); margin: 6px 0 var(--space-sm) 0;">
            هذا أمر طبيعي تماماً مع بعض الروايات والطبعات العربية والمصرية التي تصدر برقم إيداع محلي غير مفهرس في المكتبات الغربية.
          </p>
          <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
            <button class="btn btn-sm btn-primary" id="btn-prefill-manual">
              ✍️ إدخال بيانات الكتاب مع حفظ "${escapeHtml(rawQuery)}"
            </button>
          </div>
        </div>
      </div>
    `;

    listEl.querySelector('#btn-prefill-manual').addEventListener('click', () => {
      if (scannerInstance) scannerInstance.stop();
      if (isIsbn) {
        navigateTo('book-form', { prefill: { isbn: cleanIsbn } });
      } else {
        navigateTo('book-form', { prefill: { title: rawQuery } });
      }
    });
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
                ${metadata.coverImage ? `<img src="${metadata.coverImage}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">غلاف افتراضي</div>'}
              </div>
              <div style="flex: 1; min-width: 200px;">
                <h4 style="font-size: 1.15rem; margin-bottom: 2px;">${escapeHtml(metadata.title)}</h4>
                <p style="font-size: 0.85rem; color: var(--accent-gold); margin-bottom: 6px;">${escapeHtml((metadata.authors || []).join(', '))}</p>
                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 2px;">
                  ${metadata.isbn ? `<span>ردمك (ISBN): ${escapeHtml(metadata.isbn)}</span>` : ''}
                  ${metadata.publisher ? `<span>دار النشر: ${escapeHtml(metadata.publisher)}</span>` : ''}
                  ${metadata.publicationYear ? `<span>سنة النشر: ${escapeHtml(metadata.publicationYear)}</span>` : ''}
                  ${metadata.pageCount ? `<span>عدد الصفحات: ${escapeHtml(metadata.pageCount)}</span>` : ''}
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
              ✏️ تعديل وإكمال التفاصيل
            </button>
            <button class="btn btn-primary btn-sm" id="btn-confirm-add-library">
              ✓ إضافة فورية للرفوف
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
        isbn: metadata.isbn || '',
        language: metadata.language || (isArabic(metadata.title) ? 'ar' : 'en'),
        pageCount: metadata.pageCount,
        coverImage: metadata.coverImage || '',
        category: metadata.category || 'literature',
        review: metadata.description || ''
      };
      await saveBook(newBook);
      allBooks.push(newBook);
      mount.innerHTML = '';

      if (isContinuousMode) {
        alert(`تم حفظ "${metadata.title}" بنجاح! وجّه الكاميرا للكتاب التالي.`);
      } else {
        if (scannerInstance) scannerInstance.stop();
        navigateTo('library');
      }
    });
  }
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text || '');
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
