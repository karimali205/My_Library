/**
 * book-form.js - Add and Edit Book Form
 * Features collapsible accordion sections, Quick-Add mode toggle,
 * autocomplete for authors/publishers/categories, cover compression,
 * dynamic quotes list, and duplicate detection.
 */

import { getBookById, getAllBooks, saveBook } from '../db.js';
import { createEmptyBook, sanitizeBook, DEFAULT_CATEGORIES } from '../models.js';
import { t, isRTL, normalizeArabic } from '../i18n.js';
import { compressImageFile } from '../utils/image-compressor.js';

let isQuickMode = false;

export async function renderBookFormView(container, navigateTo, params = {}) {
  const allBooks = await getAllBooks();
  let book = createEmptyBook();
  let isEditing = false;

  if (params.bookId) {
    const existing = await getBookById(params.bookId);
    if (existing) {
      book = existing;
      isEditing = true;
    }
  } else if (params.prefill) {
    // Prefill from smart-add metadata
    book = { ...book, ...params.prefill };
  }

  // Pre-gather autocomplete options from existing library
  const existingAuthors = Array.from(new Set(allBooks.flatMap(b => b.authors || []))).filter(Boolean);
  const existingPublishers = Array.from(new Set(allBooks.map(b => b.publisher))).filter(Boolean);
  const existingRooms = Array.from(new Set(allBooks.map(b => b.location?.room))).filter(Boolean);
  const existingCabinets = Array.from(new Set(allBooks.map(b => b.location?.cabinet))).filter(Boolean);
  const existingShelves = Array.from(new Set(allBooks.map(b => b.location?.shelf))).filter(Boolean);
  const existingSeries = Array.from(new Set(allBooks.map(b => b.series?.name))).filter(Boolean);

  function render() {
    container.innerHTML = `
      <div class="view-container" style="max-width: 900px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-sm);">
          <div>
            <h2 style="color: var(--accent-gold); margin: 0;">
              ${isEditing ? t('edit') + ': ' + escapeHtml(book.title) : t('addNewBook')}
            </h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
              ${isQuickMode ? t('quickAdd') : t('fullAdd')}
            </p>
          </div>

          <div style="display: flex; gap: var(--space-sm); align-items: center;">
            <button class="btn btn-sm btn-secondary" id="btn-toggle-quick-mode">
              ${isQuickMode ? '📑 ' + t('fullAdd') : '⚡ ' + t('quickAdd')}
            </button>
            <button class="btn btn-sm btn-secondary" id="btn-cancel-form">
              ${t('cancel')}
            </button>
            <button class="btn btn-sm btn-primary" id="btn-save-book">
              💾 ${t('save')}
            </button>
          </div>
        </div>

        <form id="book-edit-form" onsubmit="return false;">
          <!-- SECTION 1: BASIC INFORMATION -->
          <div class="form-section-accordion">
            <div class="accordion-header">
              <span>📖 ${t('basicInfoSection')}</span>
            </div>
            <div class="accordion-content">
              <div class="form-group col-span-full">
                <label class="form-label">${t('bookTitle')} *</label>
                <input type="text" id="field-title" class="form-control" required value="${escapeHtml(book.title)}">
              </div>

              ${!isQuickMode ? `
                <div class="form-group col-span-full">
                  <label class="form-label">${t('bookSubtitle')}</label>
                  <input type="text" id="field-subtitle" class="form-control" value="${escapeHtml(book.subtitle || '')}">
                </div>
              ` : ''}

              <div class="form-group">
                <label class="form-label">${t('authors')} *</label>
                <input type="text" id="field-authors" class="form-control" list="authors-datalist" placeholder="${t('authorsHelp')}" value="${escapeHtml((book.authors || []).join(', '))}">
                <datalist id="authors-datalist">
                  ${existingAuthors.map(a => `<option value="${escapeHtml(a)}">`).join('')}
                </datalist>
              </div>

              <div class="form-group">
                <label class="form-label">${t('mainCategory')}</label>
                <select id="field-category" class="form-control">
                  ${DEFAULT_CATEGORIES.map(c => `
                    <option value="${c.id}" ${book.category === c.id ? 'selected' : ''}>${isRTL() ? c.ar : c.en}</option>
                  `).join('')}
                </select>
              </div>

              ${!isQuickMode ? `
                <div class="form-group">
                  <label class="form-label">${t('subcategory')}</label>
                  <input type="text" id="field-subcategory" class="form-control" value="${escapeHtml(book.subcategory || '')}">
                </div>

                <div class="form-group">
                  <label class="form-label">${t('publisher')}</label>
                  <input type="text" id="field-publisher" class="form-control" list="publishers-datalist" value="${escapeHtml(book.publisher || '')}">
                  <datalist id="publishers-datalist">
                    ${existingPublishers.map(p => `<option value="${escapeHtml(p)}">`).join('')}
                  </datalist>
                </div>

                <div class="form-group">
                  <label class="form-label">${t('publicationYear')}</label>
                  <input type="text" id="field-year" class="form-control" placeholder="e.g. 2021" value="${escapeHtml(book.publicationYear || '')}">
                </div>

                <div class="form-group">
                  <label class="form-label">${t('isbn')}</label>
                  <input type="text" id="field-isbn" class="form-control" placeholder="${t('isbnPlaceholder')}" value="${escapeHtml(book.isbn || '')}">
                </div>

                <div class="form-group">
                  <label class="form-label">${t('language')}</label>
                  <select id="field-language" class="form-control">
                    <option value="ar" ${book.language === 'ar' ? 'selected' : ''}>${t('langArabic')}</option>
                    <option value="en" ${book.language === 'en' ? 'selected' : ''}>${t('langEnglish')}</option>
                    <option value="fr" ${book.language === 'fr' ? 'selected' : ''}>${t('langFrench')}</option>
                    <option value="other" ${book.language === 'other' ? 'selected' : ''}>${t('langOther')}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">${t('pageCount')}</label>
                  <input type="number" id="field-pagecount" class="form-control" min="1" value="${book.pageCount || ''}">
                </div>

                <div class="form-group col-span-full">
                  <label class="form-label">${t('tags')}</label>
                  <input type="text" id="field-tags" class="form-control" placeholder="${t('tagsHelp')}" value="${escapeHtml((book.tags || []).join(', '))}">
                </div>
              ` : ''}

              <!-- Cover image upload / camera / preview -->
              <div class="form-group col-span-full">
                <label class="form-label">${t('coverImage')}</label>
                <div style="display: flex; gap: var(--space-md); align-items: center; flex-wrap: wrap;">
                  <div id="cover-preview-box" style="width: 80px; height: 115px; border-radius: 4px; overflow: hidden; background: var(--bg-secondary); border: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: center;">
                    ${book.coverImage ? `<img src="${book.coverImage}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:1.5rem;">📷</span>'}
                  </div>
                  <div style="display: flex; flex-direction: column; gap: var(--space-xs); flex: 1;">
                    <div style="display: flex; gap: var(--space-xs);">
                      <label class="btn btn-sm btn-secondary" style="cursor: pointer;">
                        📁 ${t('uploadImage')}
                        <input type="file" id="file-cover-input" accept="image/*" style="display: none;">
                      </label>
                      ${book.coverImage ? `<button class="btn btn-sm btn-icon" id="btn-remove-cover" style="color:#ef4444;" title="${t('removeCover')}">✕</button>` : ''}
                    </div>
                    <input type="url" id="field-cover-url" class="form-control btn-sm" placeholder="Or paste image URL..." value="${book.coverImage && book.coverImage.startsWith('http') ? escapeHtml(book.coverImage) : ''}">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 2: PHYSICAL LOCATION & CONDITION -->
          <div class="form-section-accordion">
            <div class="accordion-header">
              <span>📍 ${t('physicalLocationSection')}</span>
            </div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('room')}</label>
                <input type="text" id="field-room" class="form-control" list="rooms-datalist" value="${escapeHtml(book.location?.room || 'Main Library')}">
                <datalist id="rooms-datalist">
                  ${existingRooms.map(r => `<option value="${escapeHtml(r)}">`).join('')}
                </datalist>
              </div>

              <div class="form-group">
                <label class="form-label">${t('cabinet')}</label>
                <input type="text" id="field-cabinet" class="form-control" list="cabinets-datalist" value="${escapeHtml(book.location?.cabinet || 'Cabinet 1')}">
                <datalist id="cabinets-datalist">
                  ${existingCabinets.map(c => `<option value="${escapeHtml(c)}">`).join('')}
                </datalist>
              </div>

              <div class="form-group">
                <label class="form-label">${t('shelf')}</label>
                <input type="text" id="field-shelf" class="form-control" list="shelves-datalist" value="${escapeHtml(book.location?.shelf || 'Shelf 1')}">
                <datalist id="shelves-datalist">
                  ${existingShelves.map(s => `<option value="${escapeHtml(s)}">`).join('')}
                </datalist>
              </div>

              ${!isQuickMode ? `
                <div class="form-group">
                  <label class="form-label">${t('physicalCondition')}</label>
                  <select id="field-condition" class="form-control">
                    <option value="new" ${book.physicalCondition === 'new' ? 'selected' : ''}>${t('conditionNew')}</option>
                    <option value="good" ${book.physicalCondition === 'good' ? 'selected' : ''}>${t('conditionGood')}</option>
                    <option value="used" ${book.physicalCondition === 'used' ? 'selected' : ''}>${t('conditionUsed')}</option>
                    <option value="damaged" ${book.physicalCondition === 'damaged' ? 'selected' : ''}>${t('conditionDamaged')}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">${t('binding')}</label>
                  <select id="field-binding" class="form-control">
                    <option value="paperback" ${book.binding === 'paperback' ? 'selected' : ''}>${t('bindingPaperback')}</option>
                    <option value="hardcover" ${book.binding === 'hardcover' ? 'selected' : ''}>${t('bindingHardcover')}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">${t('copiesCount')}</label>
                  <input type="number" id="field-copies" class="form-control" min="1" value="${book.copies || 1}">
                </div>
              ` : ''}
            </div>
          </div>

          <!-- SECTION 3: READING STATUS & PROGRESS -->
          <div class="form-section-accordion">
            <div class="accordion-header">
              <span>⏳ ${t('readingProgressSection')}</span>
            </div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('status')}</label>
                <select id="field-status" class="form-control">
                  <option value="unread" ${book.status === 'unread' ? 'selected' : ''}>${t('statusUnread')}</option>
                  <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>${t('statusReading')}</option>
                  <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>${t('statusFinished')}</option>
                  <option value="paused" ${book.status === 'paused' ? 'selected' : ''}>${t('statusPaused')}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('currentPage')}</label>
                <input type="number" id="field-currentpage" class="form-control" min="0" value="${book.currentPage || 0}">
              </div>

              <div class="form-group">
                <label class="form-label">${t('starRating')} (0 - 5)</label>
                <input type="number" id="field-rating" class="form-control" min="0" max="5" step="0.5" value="${book.rating || 0}">
              </div>

              <div class="form-group">
                <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:28px;">
                  <input type="checkbox" id="field-favorite" ${book.isFavorite ? 'checked' : ''} style="width:18px;height:18px;">
                  <span>★ ${t('isFavorite')}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- SECTION 4: REVIEWS & QUOTES (Hidden in quick mode) -->
          ${!isQuickMode ? `
            <div class="form-section-accordion">
              <div class="accordion-header">
                <span>💬 ${t('reviewAndNotesSection')}</span>
              </div>
              <div class="accordion-content">
                <div class="form-group col-span-full">
                  <label class="form-label">${t('personalReview')}</label>
                  <textarea id="field-review" class="form-control" rows="3">${escapeHtml(book.review || '')}</textarea>
                </div>

                <!-- Quotes Management -->
                <div class="form-group col-span-full">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-xs);">
                    <label class="form-label">${t('quotesAndNotes')}</label>
                    <button type="button" class="btn btn-sm btn-secondary" id="btn-add-quote-row">${t('addQuote')}</button>
                  </div>
                  <div id="quotes-form-list" style="display:flex;flex-direction:column;gap:var(--space-xs);">
                    ${(book.quotes || []).map((q, i) => `
                      <div class="quote-form-row" style="display:flex;gap:var(--space-xs);align-items:center;">
                        <input type="text" class="form-control quote-input-text" placeholder="${t('quoteText')}" value="${escapeHtml(q.text)}" style="flex:1;">
                        <input type="number" class="form-control quote-input-page" placeholder="${t('quotePage')}" value="${q.page || ''}" style="width:90px;">
                        <button type="button" class="btn btn-sm btn-icon btn-remove-quote" style="color:#ef4444;">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION 5: SERIES & COLLECTIONS & VALUE -->
            <div class="form-section-accordion">
              <div class="accordion-header">
                <span>🏷️ ${t('purchaseAndLoanSection')}</span>
              </div>
              <div class="accordion-content">
                <div class="form-group">
                  <label class="form-label">${t('seriesName')}</label>
                  <input type="text" id="field-series-name" class="form-control" list="series-datalist" value="${escapeHtml(book.series?.name || '')}">
                  <datalist id="series-datalist">
                    ${existingSeries.map(s => `<option value="${escapeHtml(s)}">`).join('')}
                  </datalist>
                </div>

                <div class="form-group">
                  <label class="form-label">${t('seriesVolume')}</label>
                  <input type="text" id="field-series-vol" class="form-control" placeholder="e.g. 1" value="${escapeHtml(book.series?.volume || '')}">
                </div>

                <div class="form-group col-span-full">
                  <label class="form-label">${t('collections')}</label>
                  <input type="text" id="field-collections" class="form-control" placeholder="${t('collectionsHelp')}" value="${escapeHtml((book.collections || []).join(', '))}">
                </div>

                <div class="form-group">
                  <label class="form-label">${t('purchasePrice')}</label>
                  <input type="number" id="field-price" class="form-control" min="0" step="0.5" value="${book.purchasePrice || ''}">
                </div>

                <div class="form-group">
                  <label class="form-label">${t('currency')}</label>
                  <select id="field-currency" class="form-control">
                    <option value="USD" ${book.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="EUR" ${book.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                    <option value="GBP" ${book.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                    <option value="SAR" ${book.currency === 'SAR' ? 'selected' : ''}>SAR (ر.س)</option>
                    <option value="EGP" ${book.currency === 'EGP' ? 'selected' : ''}>EGP (ج.م)</option>
                    <option value="AED" ${book.currency === 'AED' ? 'selected' : ''}>AED (د.إ)</option>
                  </select>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Bottom Actions -->
          <div style="display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-lg);">
            <button class="btn btn-secondary" id="btn-cancel-bottom">${t('cancel')}</button>
            <button class="btn btn-primary" id="btn-save-bottom">💾 ${t('save')}</button>
          </div>
        </form>
      </div>
    `;

    attachFormEvents();
  }

  function attachFormEvents() {
    // Mode toggle
    container.querySelector('#btn-toggle-quick-mode').addEventListener('click', () => {
      syncFormDataToBook();
      isQuickMode = !isQuickMode;
      render();
    });

    // Cancel buttons
    const cancelAction = () => {
      if (isEditing) navigateTo('book-details', { bookId: book.id });
      else navigateTo('library');
    };
    container.querySelector('#btn-cancel-form').addEventListener('click', cancelAction);
    const cancelBottom = container.querySelector('#btn-cancel-bottom');
    if (cancelBottom) cancelBottom.addEventListener('click', cancelAction);

    // Save buttons
    container.querySelector('#btn-save-book').addEventListener('click', handleSave);
    const saveBottom = container.querySelector('#btn-save-bottom');
    if (saveBottom) saveBottom.addEventListener('click', handleSave);

    // Image upload file picker with auto compression
    const fileInput = container.querySelector('#file-cover-input');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const compressed = await compressImageFile(file, 400);
            book.coverImage = compressed;
            const previewBox = container.querySelector('#cover-preview-box');
            if (previewBox) {
              previewBox.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;">`;
            }
          } catch (err) {
            alert('Failed to process image: ' + err.message);
          }
        }
      });
    }

    // Remove cover
    const btnRemoveCover = container.querySelector('#btn-remove-cover');
    if (btnRemoveCover) {
      btnRemoveCover.addEventListener('click', () => {
        book.coverImage = '';
        render();
      });
    }

    // Cover URL input
    const coverUrlInput = container.querySelector('#field-cover-url');
    if (coverUrlInput) {
      coverUrlInput.addEventListener('change', (e) => {
        const url = e.target.value.trim();
        if (url) {
          book.coverImage = url;
          const previewBox = container.querySelector('#cover-preview-box');
          if (previewBox) {
            previewBox.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
          }
        }
      });
    }

    // Add quote button
    const btnAddQuote = container.querySelector('#btn-add-quote-row');
    if (btnAddQuote) {
      btnAddQuote.addEventListener('click', () => {
        const list = container.querySelector('#quotes-form-list');
        const row = document.createElement('div');
        row.className = 'quote-form-row';
        row.style.cssText = 'display:flex;gap:var(--space-xs);align-items:center;';
        row.innerHTML = `
          <input type="text" class="form-control quote-input-text" placeholder="${t('quoteText')}" style="flex:1;">
          <input type="number" class="form-control quote-input-page" placeholder="${t('quotePage')}" style="width:90px;">
          <button type="button" class="btn btn-sm btn-icon btn-remove-quote" style="color:#ef4444;">✕</button>
        `;
        row.querySelector('.btn-remove-quote').addEventListener('click', () => row.remove());
        list.appendChild(row);
      });
    }

    container.querySelectorAll('.btn-remove-quote').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.quote-form-row').remove();
      });
    });
  }

  function syncFormDataToBook() {
    const titleEl = container.querySelector('#field-title');
    if (titleEl) book.title = titleEl.value.trim();

    const subtitleEl = container.querySelector('#field-subtitle');
    if (subtitleEl) book.subtitle = subtitleEl.value.trim();

    const authorsEl = container.querySelector('#field-authors');
    if (authorsEl) {
      book.authors = authorsEl.value.split(',').map(s => s.trim()).filter(Boolean);
    }

    const catEl = container.querySelector('#field-category');
    if (catEl) book.category = catEl.value;

    const subcatEl = container.querySelector('#field-subcategory');
    if (subcatEl) book.subcategory = subcatEl.value.trim();

    const pubEl = container.querySelector('#field-publisher');
    if (pubEl) book.publisher = pubEl.value.trim();

    const yearEl = container.querySelector('#field-year');
    if (yearEl) book.publicationYear = yearEl.value.trim();

    const isbnEl = container.querySelector('#field-isbn');
    if (isbnEl) book.isbn = isbnEl.value.trim();

    const langEl = container.querySelector('#field-language');
    if (langEl) book.language = langEl.value;

    const pagesEl = container.querySelector('#field-pagecount');
    if (pagesEl) book.pageCount = pagesEl.value ? parseInt(pagesEl.value, 10) : null;

    const tagsEl = container.querySelector('#field-tags');
    if (tagsEl) book.tags = tagsEl.value.split(',').map(s => s.trim()).filter(Boolean);

    // Location
    const roomEl = container.querySelector('#field-room');
    const cabEl = container.querySelector('#field-cabinet');
    const shelfEl = container.querySelector('#field-shelf');
    book.location = {
      room: (roomEl && roomEl.value.trim()) || 'Main Library',
      cabinet: (cabEl && cabEl.value.trim()) || 'Cabinet 1',
      shelf: (shelfEl && shelfEl.value.trim()) || 'Shelf 1'
    };

    const condEl = container.querySelector('#field-condition');
    if (condEl) book.physicalCondition = condEl.value;

    const bindEl = container.querySelector('#field-binding');
    if (bindEl) book.binding = bindEl.value;

    const copiesEl = container.querySelector('#field-copies');
    if (copiesEl) book.copies = parseInt(copiesEl.value, 10) || 1;

    const statusEl = container.querySelector('#field-status');
    if (statusEl) book.status = statusEl.value;

    const currPageEl = container.querySelector('#field-currentpage');
    if (currPageEl) book.currentPage = parseInt(currPageEl.value, 10) || 0;

    const ratingEl = container.querySelector('#field-rating');
    if (ratingEl) book.rating = parseFloat(ratingEl.value) || 0;

    const favEl = container.querySelector('#field-favorite');
    if (favEl) book.isFavorite = favEl.checked;

    const reviewEl = container.querySelector('#field-review');
    if (reviewEl) book.review = reviewEl.value.trim();

    // Quotes
    const quoteRows = container.querySelectorAll('.quote-form-row');
    if (quoteRows.length > 0) {
      book.quotes = Array.from(quoteRows).map(row => {
        const text = row.querySelector('.quote-input-text').value.trim();
        const page = row.querySelector('.quote-input-page').value.trim();
        return text ? { id: 'q_' + Math.random().toString(36).substr(2, 6), text, page: page ? parseInt(page, 10) : null } : null;
      }).filter(Boolean);
    }

    // Series
    const serName = container.querySelector('#field-series-name');
    const serVol = container.querySelector('#field-series-vol');
    if (serName || serVol) {
      book.series = {
        name: (serName && serName.value.trim()) || '',
        volume: (serVol && serVol.value.trim()) || ''
      };
    }

    const collEl = container.querySelector('#field-collections');
    if (collEl) {
      book.collections = collEl.value.split(',').map(s => s.trim()).filter(Boolean);
    }

    const priceEl = container.querySelector('#field-price');
    if (priceEl) book.purchasePrice = priceEl.value ? parseFloat(priceEl.value) : null;

    const currEl = container.querySelector('#field-currency');
    if (currEl) book.currency = currEl.value;
  }

  async function handleSave() {
    syncFormDataToBook();

    if (!book.title) {
      alert(t('requiredField') + ': ' + t('bookTitle'));
      container.querySelector('#field-title').focus();
      return;
    }

    // Duplicate Detection check (if new book)
    if (!isEditing) {
      const cleanIsbn = (book.isbn || '').replace(/[^0-9X]/gi, '');
      const normTitle = normalizeArabic(book.title);
      
      const duplicate = allBooks.find(b => {
        if (cleanIsbn && (b.isbn || '').replace(/[^0-9X]/gi, '') === cleanIsbn) return true;
        if (normTitle && normalizeArabic(b.title) === normTitle) {
          const auth1 = (b.authors && b.authors[0]) || '';
          const auth2 = (book.authors && book.authors[0]) || '';
          if (auth1 && auth2 && normalizeArabic(auth1) === normalizeArabic(auth2)) return true;
        }
        return false;
      });

      if (duplicate) {
        const choice = confirm(t('duplicateDetectedMsg', { title: duplicate.title, author: (duplicate.authors || []).join(', ') }) + '\n\n' + t('addAsCopy') + '?');
        if (!choice) {
          return;
        }
        book.title = `${book.title} (${t('edition')} 2)`;
      }
    }

    const saved = await saveBook(book);
    navigateTo('book-details', { bookId: saved.id });
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
