/**
 * book-details.js - Rich Book Record View
 * Presents book cover/spine, metadata, vintage parchment quotes,
 * library-card lending record, related books, print label, and web sharing.
 */

import { getBookById, getAllBooks, saveBook, deleteBook } from '../db.js';
import { t, isRTL, formatDate, formatNumber } from '../i18n.js';
import { createStyledCoverHTML } from '../utils/spine-generator.js';
import { printBookLabels } from '../utils/print.js';
import { searchBookCover } from '../utils/cover-fetcher.js';

export async function renderBookDetailsView(container, navigateTo, params = {}) {
  const bookId = params.bookId;
  if (!bookId) {
    navigateTo('library');
    return;
  }

  const book = await getBookById(bookId);
  if (!book) {
    container.innerHTML = `
      <div class="view-container" style="text-align: center; padding: var(--space-xl);">
        <h3>Book not found</h3>
        <button class="btn btn-primary" id="btn-back-lib">${t('back')} ${t('navLibrary')}</button>
      </div>
    `;
    container.querySelector('#btn-back-lib').addEventListener('click', () => navigateTo('library'));
    return;
  }

  const allBooks = await getAllBooks();
  // Find related books (same author or category)
  const relatedBooks = allBooks
    .filter(b => b.id !== book.id && (b.category === book.category || (b.authors && book.authors && b.authors[0] === book.authors[0])))
    .slice(0, 4);

  const pagesTotal = book.pageCount || 0;
  const progressPercent = pagesTotal > 0 ? Math.min(100, Math.round(((book.currentPage || 0) / pagesTotal) * 100)) : 0;
  const isArabic = book.language === 'ar' || /[\u0600-\u06FF]/.test(book.title);

  container.innerHTML = `
    <div class="view-container">
      <!-- Breadcrumb / Header Actions -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-sm);">
        <button class="btn btn-secondary btn-sm" id="btn-back">
          ← ${t('back')}
        </button>

        <div style="display: flex; gap: var(--space-xs); align-items: center;">
          <button class="btn btn-secondary btn-sm" id="btn-share-book" title="${t('share')}">
            🔗 ${t('share')}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-print-label" title="${t('printBookLabel')}">
            🏷️ ${t('printBookLabel')}
          </button>
          <button class="btn btn-primary btn-sm" id="btn-edit-book">
            ✏️ ${t('edit')}
          </button>
          <button class="btn btn-danger btn-sm" id="btn-delete-book" title="${t('delete')}">
            🗑️
          </button>
        </div>
      </div>

      <div class="book-details-hero">
        <!-- Left: Book Cover & Quick Badges -->
        <div class="details-cover-pane">
          ${book.coverImage ? `
            <img src="${book.coverImage}" alt="${escapeHtml(book.title)}">
          ` : createStyledCoverHTML(book, 'large')}

          <button class="btn btn-secondary btn-sm" id="btn-fetch-cover-online" style="width: 100%; margin-top: 4px;">
            🌐 ${book.coverImage ? 'تحديث الغلاف أونلاين' : 'جلب الغلاف أونلاين'}
          </button>

          <div style="width: 100%; display: flex; flex-direction: column; gap: var(--space-xs); margin-top: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
              <span>${t('status')}:</span>
              <span class="badge badge-${book.status || 'unread'}">${t('status' + capitalize(book.status || 'unread'))}</span>
            </div>

            ${book.rating ? `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span>${t('starRating')}:</span>
                <span style="color: #f59e0b; font-weight: bold;">★ ${book.rating} / 5</span>
              </div>
            ` : ''}

            ${pagesTotal > 0 ? `
              <div style="margin-top: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">
                  <span>${t('progress')}</span>
                  <span>${formatNumber(book.currentPage || 0)} / ${formatNumber(pagesTotal)} (${formatNumber(progressPercent)}%)</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden;">
                  <div style="height: 100%; width: ${progressPercent}%; background: var(--accent-gold);"></div>
                </div>
              </div>
            ` : ''}

            <!-- Physical Location Box -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-sm); font-size: 0.8rem; margin-top: 6px;">
              <strong style="color: var(--accent-gold); display: block; margin-bottom: 4px;">📍 ${t('physicalLocationSection')}:</strong>
              <div>${escapeHtml(book.location?.room || 'Main Library')}</div>
              <div style="color: var(--text-muted);">${escapeHtml(book.location?.cabinet || '')} • ${escapeHtml(book.location?.shelf || '')}</div>
            </div>
          </div>
        </div>

        <!-- Right: Metadata & Tabs -->
        <div class="details-info-pane">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-xs); margin-bottom: 4px;">
              <span class="badge">${escapeHtml(book.category || '')}</span>
              ${book.subcategory ? `<span class="badge" style="background: transparent; border: 1px solid var(--border-color);">${escapeHtml(book.subcategory)}</span>` : ''}
              ${book.isFavorite ? `<span style="color: #ffd700;" title="Favorite">★</span>` : ''}
            </div>
            <h1 style="font-size: 1.8rem; margin-bottom: 4px;">${escapeHtml(book.title)}</h1>
            ${book.subtitle ? `<h2 style="font-size: 1.1rem; color: var(--text-muted); font-weight: normal; margin-bottom: var(--space-xs);">${escapeHtml(book.subtitle)}</h2>` : ''}
            <h3 style="font-size: 1.1rem; color: var(--accent-gold); font-weight: 600; margin-bottom: var(--space-md);">${escapeHtml((book.authors || []).join(' • '))}</h3>
          </div>

          <!-- Quick facts grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-sm); background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.85rem;">
            ${book.publisher ? `<div><span style="color:var(--text-muted);">${t('publisher')}:</span> <strong>${escapeHtml(book.publisher)}</strong></div>` : ''}
            ${book.publicationYear ? `<div><span style="color:var(--text-muted);">${t('publicationYear')}:</span> <strong>${escapeHtml(book.publicationYear)}</strong></div>` : ''}
            ${book.isbn ? `<div><span style="color:var(--text-muted);">${t('isbn')}:</span> <strong>${escapeHtml(book.isbn)}</strong></div>` : ''}
            ${book.language ? `<div><span style="color:var(--text-muted);">${t('language')}:</span> <strong>${escapeHtml(book.language === 'ar' ? t('langArabic') : t('langEnglish'))}</strong></div>` : ''}
            ${book.physicalCondition ? `<div><span style="color:var(--text-muted);">${t('physicalCondition')}:</span> <strong>${t('condition' + capitalize(book.physicalCondition))}</strong></div>` : ''}
            ${book.binding ? `<div><span style="color:var(--text-muted);">${t('binding')}:</span> <strong>${t('binding' + capitalize(book.binding))}</strong></div>` : ''}
            ${book.series && book.series.name ? `<div><span style="color:var(--text-muted);">${t('seriesName')}:</span> <strong>${escapeHtml(book.series.name)} (Vol ${escapeHtml(book.series.volume)})</strong></div>` : ''}
          </div>

          <!-- Personal Review -->
          ${book.review ? `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md);">
              <h4 style="color: var(--accent-gold); margin-bottom: var(--space-xs);">${t('personalReview')}</h4>
              <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;">${escapeHtml(book.review)}</p>
            </div>
          ` : ''}

          <!-- Treasured Quotes (Vintage parchment paper style) -->
          ${book.quotes && book.quotes.length > 0 ? `
            <div class="vintage-paper-card">
              <h4 style="font-size: 1.15rem; color: #5c3b1e; margin-bottom: var(--space-md); display: flex; align-items: center; gap: 6px;">
                📜 ${t('quotesHeading')}
              </h4>
              ${book.quotes.map(q => `
                <div class="quote-item">
                  <p style="font-size: 1.05rem; line-height: 1.6; margin-bottom: 4px;">"${escapeHtml(q.text)}"</p>
                  ${q.page ? `<small style="color: #8c6847; font-weight: bold;">— ${t('quotePage')} ${formatNumber(q.page)}</small>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Lending Card / History -->
          <div class="library-loan-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #b38228; padding-bottom: 6px;">
              <strong style="text-transform: uppercase; letter-spacing: 1px;">🏷️ ${t('loanHeading')}</strong>
              ${book.loan && book.loan.isLoaned ? `
                <button class="btn btn-sm btn-brass" id="btn-return-loan">${t('markReturned')}</button>
              ` : `
                <button class="btn btn-sm btn-secondary" id="btn-lend-book">${t('lendBook')}</button>
              `}
            </div>

            ${book.loan && book.loan.isLoaned ? `
              <div style="margin-top: 6px; font-size: 0.9rem;">
                <div><strong>${t('currentLoan')}:</strong> <span style="color: #991b1b; font-weight: bold;">${escapeHtml(book.loan.borrower)}</span></div>
                <div><strong>${t('loanDate')}:</strong> ${formatDate(book.loan.loanDate)}</div>
                ${book.loan.expectedReturn ? `<div><strong>${t('expectedReturnDate')}:</strong> ${formatDate(book.loan.expectedReturn)}</div>` : ''}
                ${book.loan.notes ? `<div><strong>${t('loanNotes')}:</strong> ${escapeHtml(book.loan.notes)}</div>` : ''}
              </div>
            ` : `
              <div style="font-size: 0.85rem; color: #665243; margin-top: 4px;">
                ✓ Safe on your library shelves (Not loaned).
              </div>
            `}
          </div>

          <!-- Tags & Collections -->
          ${(book.tags && book.tags.length > 0) || (book.collections && book.collections.length > 0) ? `
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-top: var(--space-xs);">
              ${(book.collections || []).map(col => `
                <span class="badge" style="background: rgba(197, 155, 39, 0.15); color: var(--accent-gold); border: 1px solid var(--accent-gold);">
                  📁 ${escapeHtml(col)}
                </span>
              `).join('')}
              ${(book.tags || []).map(tag => `
                <span class="badge">#${escapeHtml(tag)}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Related Books Section -->
      ${relatedBooks.length > 0 ? `
        <div style="margin-top: var(--space-xl); border-top: 1px solid var(--border-color); padding-top: var(--space-lg);">
          <h3 style="font-size: 1.15rem; color: var(--accent-gold); margin-bottom: var(--space-md);">${t('relatedBooks')}</h3>
          <div class="books-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
            ${relatedBooks.map(b => `
              <div class="book-card" data-related-id="${b.id}">
                <div class="book-card-cover-container">
                  ${b.coverImage ? `<img src="${b.coverImage}" alt="${escapeHtml(b.title)}" class="book-card-cover-img">` : createStyledCoverHTML(b, 'small')}
                </div>
                <div class="book-card-body">
                  <h4 class="book-card-title">${escapeHtml(b.title)}</h4>
                  <p class="book-card-author">${escapeHtml((b.authors || []).join(', '))}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Attach Event Handlers
  container.querySelector('#btn-back').addEventListener('click', () => navigateTo('library'));
  container.querySelector('#btn-edit-book').addEventListener('click', () => navigateTo('book-form', { bookId: book.id }));

  const btnFetchCover = container.querySelector('#btn-fetch-cover-online');
  if (btnFetchCover) {
    btnFetchCover.addEventListener('click', async () => {
      btnFetchCover.disabled = true;
      btnFetchCover.textContent = '⏳ جاري البحث عن الغلاف...';
      try {
        const author = (book.authors && book.authors.length > 0) ? book.authors[0] : '';
        const res = await searchBookCover(book.title, author, book.isbn);
        if (res && res.dataUrl) {
          book.coverImage = res.dataUrl;
          await saveBook(book);
          alert('✅ تم جلب غلاف الكتاب وحفظه بنجاح على جهازك!');
          renderBookDetailsView(container, navigateTo, { bookId: book.id });
        } else {
          alert('لم يتم العثور على غلاف أونلاين مطابق. يمكنك رفع صورة غلاف يدوياً من زر تعديل الكتاب.');
          btnFetchCover.disabled = false;
          btnFetchCover.textContent = '🌐 جلب الغلاف أونلاين';
        }
      } catch (err) {
        alert('حدث خطأ أثناء جلب الغلاف: ' + (err.message || err));
        btnFetchCover.disabled = false;
        btnFetchCover.textContent = '🌐 جلب الغلاف أونلاين';
      }
    });
  }

  container.querySelector('#btn-print-label').addEventListener('click', () => {
    printBookLabels([book], 'medium');
  });

  // Share via Web Share API or copy link
  container.querySelector('#btn-share-book').addEventListener('click', async () => {
    const shareData = {
      title: `${book.title} - My Library`,
      text: `Reading '${book.title}' by ${(book.authors || []).join(', ')} on My Library.`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${book.title} by ${(book.authors || []).join(', ')}`);
      alert(t('savedSuccessfully') + ' (Copied to clipboard)');
    }
  });

  // Delete book to trash
  container.querySelector('#btn-delete-book').addEventListener('click', async () => {
    if (confirm(t('deletedSuccessfully') + '?')) {
      await deleteBook(book.id);
      navigateTo('library');
    }
  });

  // Lend Book Handler
  const btnLend = container.querySelector('#btn-lend-book');
  if (btnLend) {
    btnLend.addEventListener('click', async () => {
      const borrower = prompt(t('borrowerName') + ':');
      if (borrower) {
        const dueDate = prompt(t('dueDate') + ' (YYYY-MM-DD):', new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
        book.loan = {
          isLoaned: true,
          borrower: borrower.trim(),
          loanDate: new Date().toISOString(),
          expectedReturn: dueDate || '',
          notes: ''
        };
        await saveBook(book);
        renderBookDetailsView(container, navigateTo, { bookId: book.id });
      }
    });
  }

  // Return Book Handler
  const btnReturn = container.querySelector('#btn-return-loan');
  if (btnReturn) {
    btnReturn.addEventListener('click', async () => {
      if (confirm(t('markReturned') + '?')) {
        // Archive in loan history
        if (!book.loanHistory) book.loanHistory = [];
        book.loanHistory.push({
          borrower: book.loan.borrower,
          loanDate: book.loan.loanDate,
          returnDate: new Date().toISOString(),
          notes: book.loan.notes
        });
        book.loan = { isLoaned: false };
        await saveBook(book);
        renderBookDetailsView(container, navigateTo, { bookId: book.id });
      }
    });
  }

  // Related book clicks
  container.querySelectorAll('[data-related-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.relatedId;
      navigateTo('book-details', { bookId: id });
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
