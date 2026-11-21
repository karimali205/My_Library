/**
 * library.js - Main Library Catalog Screen
 * Supports 3 views: (1) Wooden Bookshelf, (2) Card Grid, (3) Data Table.
 * Features normalized Arabic/English fuzzy search, multi-factor filters,
 * pagination/virtual grouping, bulk editing & delete, and saved filter presets.
 */

import { getAllBooks, saveBooksBatch, deleteBook } from '../db.js';
import { t, isRTL, normalizeSearch, formatNumber } from '../i18n.js';
import { getCategoryLabel } from '../models.js';
import { createSpineElement, createStyledCoverHTML } from '../utils/spine-generator.js';

let currentViewMode = localStorage.getItem('mylibrary_view_mode') || 'bookshelf'; // 'bookshelf' | 'grid' | 'table'
let currentSort = 'title'; // 'title' | 'author' | 'dateAdded' | 'year' | 'rating'
let currentSortOrder = 'asc'; // 'asc' | 'desc'
let searchQuery = '';
let activeFilters = {
  category: 'all',
  status: 'all',
  language: 'all',
  favoritesOnly: false,
  shelf: 'all'
};
let selectedBookIds = new Set();
let currentPage = 1;
const ITEMS_PER_PAGE = 48; // For pagination of large libraries (5000+ books)

export async function renderLibraryView(container, navigateTo, initialParams = {}) {
  // Handle initial filter parameters if provided (e.g. from home stats)
  if (initialParams.statusFilter) {
    if (initialParams.statusFilter === 'loaned') {
      activeFilters.status = 'loaned';
    } else if (initialParams.statusFilter !== 'all') {
      activeFilters.status = initialParams.statusFilter;
    }
  }
  if (initialParams.shelfFilter) {
    activeFilters.shelf = initialParams.shelfFilter;
  }
  if (initialParams.categoryFilter) {
    activeFilters.category = initialParams.categoryFilter;
  }

  const allBooks = await getAllBooks();

  function render() {
    // 1. Filter books
    const filteredBooks = filterBooks(allBooks);
    // 2. Sort books
    const sortedBooks = sortBooks(filteredBooks);

    container.innerHTML = `
      <div class="view-container">
        <!-- Toolbar & Filter Area -->
        <div class="library-toolbar">
          <div class="toolbar-main-row">
            <!-- Search bar -->
            <div class="search-input-wrapper">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="lib-search-input" class="form-control" placeholder="${t('searchPlaceholder')}" value="${escapeHtml(searchQuery)}">
              ${searchQuery ? `<button id="btn-clear-search" class="search-clear-btn" title="Clear">✕</button>` : ''}
            </div>

            <!-- View mode switch -->
            <div class="view-switcher">
              <button class="view-switch-btn ${currentViewMode === 'bookshelf' ? 'active' : ''}" data-view="bookshelf" title="${t('viewBookshelf')}">
                📚 <span>${t('viewBookshelf')}</span>
              </button>
              <button class="view-switch-btn ${currentViewMode === 'grid' ? 'active' : ''}" data-view="grid" title="${t('viewGrid')}">
                ⊞ <span>${t('viewGrid')}</span>
              </button>
              <button class="view-switch-btn ${currentViewMode === 'table' ? 'active' : ''}" data-view="table" title="${t('viewTable')}">
                ☰ <span>${t('viewTable')}</span>
              </button>
            </div>

            <!-- Sort dropdown -->
            <div style="display: flex; gap: 4px; align-items: center;">
              <select id="lib-sort-select" class="form-control btn-sm" style="width: auto;">
                <option value="title" ${currentSort === 'title' ? 'selected' : ''}>${t('sortTitle')}</option>
                <option value="author" ${currentSort === 'author' ? 'selected' : ''}>${t('sortAuthor')}</option>
                <option value="dateAdded" ${currentSort === 'dateAdded' ? 'selected' : ''}>${t('sortDateAdded')}</option>
                <option value="year" ${currentSort === 'year' ? 'selected' : ''}>${t('sortYear')}</option>
                <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>${t('sortRating')}</option>
              </select>
              <button id="btn-sort-order" class="btn btn-sm btn-icon" title="Toggle order">
                ${currentSortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <!-- Density Switcher -->
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn btn-sm btn-icon" id="btn-cycle-density" title="${t('densityLabel')}">
                🪟 <span style="font-size: 0.75rem;">${document.documentElement.getAttribute('data-density') || 'Comfortable'}</span>
              </button>
            </div>

            <!-- Add book action -->
            <button class="btn btn-sm btn-primary" id="btn-toolbar-add-book" style="margin-inline-start: auto;">
              + ${t('addNewBook')}
            </button>
          </div>

          <!-- Secondary Filters Row -->
          <div class="filter-chips-row">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: bold;">${t('filter')}:</span>
            
            <button class="filter-chip ${activeFilters.status === 'all' && !activeFilters.favoritesOnly ? 'active' : ''}" data-filter-type="status" data-filter-val="all">
              ${t('all')} (${formatNumber(allBooks.length)})
            </button>

            <button class="filter-chip ${activeFilters.status === 'reading' ? 'active' : ''}" data-filter-type="status" data-filter-val="reading">
              📖 ${t('statusReading')}
            </button>

            <button class="filter-chip ${activeFilters.status === 'finished' ? 'active' : ''}" data-filter-type="status" data-filter-val="finished">
              ✓ ${t('statusFinished')}
            </button>

            <button class="filter-chip ${activeFilters.status === 'unread' ? 'active' : ''}" data-filter-type="status" data-filter-val="unread">
              ⏳ ${t('statusUnread')}
            </button>

            <button class="filter-chip ${activeFilters.status === 'loaned' ? 'active' : ''}" data-filter-type="status" data-filter-val="loaned">
              🤝 ${t('statsOnLoan')}
            </button>

            <button class="filter-chip ${activeFilters.favoritesOnly ? 'active' : ''}" data-filter-type="fav" data-filter-val="fav">
              ★ ${t('filterFavoritesOnly')}
            </button>
          </div>

          <!-- Category filter dropdown -->
          <div style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
            <select id="lib-cat-select" class="form-control btn-sm" style="width: auto;">
              <option value="all">${t('filterCategory')}: ${t('all')}</option>
              ${getUniqueCategories(allBooks).map(c => `
                <option value="${escapeHtml(c)}" ${activeFilters.category === c ? 'selected' : ''}>${escapeHtml(getCategoryLabel(c, isRTL() ? 'ar' : 'en'))}</option>
              `).join('')}
            </select>

            <select id="lib-lang-select" class="form-control btn-sm" style="width: auto;">
              <option value="all">${t('filterLanguage')}: ${t('all')}</option>
              <option value="ar" ${activeFilters.language === 'ar' ? 'selected' : ''}>العربية (Arabic)</option>
              <option value="en" ${activeFilters.language === 'en' ? 'selected' : ''}>English</option>
            </select>

            ${(activeFilters.category !== 'all' || activeFilters.status !== 'all' || activeFilters.favoritesOnly || activeFilters.language !== 'all' || searchQuery) ? `
              <button id="btn-reset-filters" class="btn btn-sm btn-icon" style="color: #ef4444;" title="${t('clear')}">
                ✕ ${t('clear')}
              </button>
            ` : ''}

            <!-- Bulk actions counter -->
            ${selectedBookIds.size > 0 ? `
              <div style="margin-inline-start: auto; display: flex; align-items: center; gap: var(--space-xs);">
                <span class="badge badge-reading">${t('selectedCount', { count: selectedBookIds.size })}</span>
                <button class="btn btn-sm btn-secondary" id="btn-bulk-category">${t('mainCategory')}</button>
                <button class="btn btn-sm btn-secondary" id="btn-bulk-status">${t('status')}</button>
                <button class="btn btn-sm btn-danger" id="btn-bulk-delete">${t('delete')}</button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Catalog Content Area -->
        <div id="catalog-content-mount">
          ${renderCatalogContent(sortedBooks)}
        </div>
      </div>
    `;

    attachEvents(sortedBooks);
  }

  function renderCatalogContent(books) {
    if (books.length === 0) {
      return `
        <div style="text-align: center; padding: var(--space-xl) var(--space-md); color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: var(--space-sm);">📖</div>
          <h3>${t('noData')}</h3>
          <p style="margin-top: 4px;">${t('searchPlaceholder')}</p>
        </div>
      `;
    }

    if (currentViewMode === 'bookshelf') {
      return renderBookshelfView(books);
    } else if (currentViewMode === 'grid') {
      return renderGridView(books);
    } else {
      return renderTableView(books);
    }
  }

  // --- 1. WOODEN BOOKSHELF VIEW ---
  function renderBookshelfView(books) {
    // Group books into shelves (by category or batches of ~16 books per shelf)
    const shelves = groupBooksIntoShelves(books);

    let html = `<div class="bookshelf-stage">`;
    shelves.forEach((shelfGroup, idx) => {
      html += `
        <div class="shelf-unit">
          <div class="shelf-header">
            <span class="shelf-title">
              🏛️ ${escapeHtml(shelfGroup.name)}
            </span>
            <span class="shelf-book-count">
              ${t('booksCount', { count: formatNumber(shelfGroup.books.length) })}
            </span>
          </div>
          <div class="shelf-books-row" data-shelf-index="${idx}">
            <!-- Spines will be mounted dynamically for optimal event handling -->
          </div>
          <div class="shelf-wood-base">
            <div class="shelf-brass-bracket left"></div>
            <div class="shelf-brass-bracket right"></div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    return html;
  }

  // --- 2. CARD GRID VIEW ---
  function renderGridView(books) {
    return `
      <div class="books-grid">
        ${books.map(book => `
          <div class="book-card" data-book-id="${book.id}">
            <div class="book-card-cover-container">
              ${book.coverImage ? `
                <img src="${book.coverImage}" alt="${escapeHtml(book.title)}" class="book-card-cover-img" loading="lazy">
              ` : createStyledCoverHTML(book, 'medium')}
            </div>
            <div class="book-card-body">
              <h4 class="book-card-title">${escapeHtml(book.title)}</h4>
              <p class="book-card-author">${escapeHtml((book.authors || []).join(', '))}</p>
              <div class="book-card-footer">
                <span class="badge badge-${book.status || 'unread'}">${t('status' + capitalize(book.status || 'unread'))}</span>
                ${book.rating ? `<span class="book-rating-stars">★ ${book.rating}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- 3. DATA TABLE VIEW ---
  function renderTableView(books) {
    return `
      <div class="table-container">
        <table class="books-table">
          <thead>
            <tr>
              <th style="width: 40px;">
                <input type="checkbox" id="th-select-all" ${selectedBookIds.size === books.length && books.length > 0 ? 'checked' : ''}>
              </th>
              <th>${t('bookTitle')}</th>
              <th>${t('authors')}</th>
              <th>${t('mainCategory')}</th>
              <th>${t('physicalLocationSection')}</th>
              <th>${t('status')}</th>
              <th>${t('starRating')}</th>
              <th>${t('publicationYear')}</th>
            </tr>
          </thead>
          <tbody>
            ${books.map(b => `
              <tr data-book-id="${b.id}">
                <td onclick="event.stopPropagation();">
                  <input type="checkbox" class="row-select-checkbox" data-book-id="${b.id}" ${selectedBookIds.has(b.id) ? 'checked' : ''}>
                </td>
                <td>
                  <strong>${escapeHtml(b.title)}</strong>
                  ${b.subtitle ? `<br><small style="color:var(--text-muted);">${escapeHtml(b.subtitle)}</small>` : ''}
                </td>
                <td>${escapeHtml((b.authors || []).join(', '))}</td>
                <td><span class="badge">${escapeHtml(getCategoryLabel(b.category || '', isRTL() ? 'ar' : 'en'))}</span></td>
                <td><small>${escapeHtml([b.location?.room, b.location?.cabinet, b.location?.shelf].filter(Boolean).join(' • '))}</small></td>
                <td><span class="badge badge-${b.status || 'unread'}">${t('status' + capitalize(b.status || 'unread'))}</span></td>
                <td>${b.rating ? '★ ' + b.rating : '-'}</td>
                <td>${escapeHtml(b.publicationYear || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function attachEvents(books) {
    // If bookshelf view, mount spine elements
    if (currentViewMode === 'bookshelf') {
      const shelves = groupBooksIntoShelves(books);
      shelves.forEach((shelfGroup, idx) => {
        const shelfRow = container.querySelector(`.shelf-books-row[data-shelf-index="${idx}"]`);
        if (shelfRow) {
          shelfGroup.books.forEach(b => {
            const spineEl = createSpineElement(b);
            spineEl.addEventListener('click', () => {
              // Smooth lift animation before navigation
              spineEl.style.transform = 'translateY(-24px) scale(1.05)';
              setTimeout(() => {
                navigateTo('book-details', { bookId: b.id });
              }, 180);
            });
            shelfRow.appendChild(spineEl);
          });
        }
      });
    }

    // Book card / row clicks
    container.querySelectorAll('[data-book-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.row-select-checkbox')) return;
        const id = el.dataset.bookId;
        if (id) navigateTo('book-details', { bookId: id });
      });
    });

    // View switch buttons
    container.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentViewMode = btn.dataset.view;
        localStorage.setItem('mylibrary_view_mode', currentViewMode);
        render();
      });
    });

    // Search input
    const searchInput = container.querySelector('#lib-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    const btnClearSearch = container.querySelector('#btn-clear-search');
    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        searchQuery = '';
        render();
      });
    }

    // Sort select & order
    const sortSelect = container.querySelector('#lib-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
      });
    }

    const btnSortOrder = container.querySelector('#btn-sort-order');
    if (btnSortOrder) {
      btnSortOrder.addEventListener('click', () => {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        render();
      });
    }

    // Density toggle button
    const btnDensity = container.querySelector('#btn-cycle-density');
    if (btnDensity) {
      btnDensity.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-density') || 'comfortable';
        const next = current === 'comfortable' ? 'compact' : (current === 'compact' ? 'spacious' : 'comfortable');
        document.documentElement.setAttribute('data-density', next);
        render();
      });
    }

    // Filter chips
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.filterType;
        const val = chip.dataset.filterVal;
        if (type === 'status') {
          activeFilters.status = val;
          activeFilters.favoritesOnly = false;
        } else if (type === 'fav') {
          activeFilters.favoritesOnly = !activeFilters.favoritesOnly;
        }
        render();
      });
    });

    // Category & Language dropdowns
    const catSelect = container.querySelector('#lib-cat-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        activeFilters.category = e.target.value;
        render();
      });
    }

    const langSelect = container.querySelector('#lib-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        activeFilters.language = e.target.value;
        render();
      });
    }

    const btnResetFilters = container.querySelector('#btn-reset-filters');
    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', () => {
        searchQuery = '';
        activeFilters = { category: 'all', status: 'all', language: 'all', favoritesOnly: false, shelf: 'all' };
        render();
      });
    }

    // Add Book toolbar button
    const btnAddBook = container.querySelector('#btn-toolbar-add-book');
    if (btnAddBook) {
      btnAddBook.addEventListener('click', () => navigateTo('book-form'));
    }

    // Table checkbox selection
    const thSelectAll = container.querySelector('#th-select-all');
    if (thSelectAll) {
      thSelectAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          books.forEach(b => selectedBookIds.add(b.id));
        } else {
          selectedBookIds.clear();
        }
        render();
      });
    }

    container.querySelectorAll('.row-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.dataset.bookId;
        if (e.target.checked) selectedBookIds.add(id);
        else selectedBookIds.delete(id);
        render();
      });
    });

    // Bulk Delete
    const btnBulkDelete = container.querySelector('#btn-bulk-delete');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', async () => {
        if (confirm(`Move ${selectedBookIds.size} books to trash?`)) {
          for (const id of selectedBookIds) {
            await deleteBook(id);
          }
          selectedBookIds.clear();
          const refreshed = await getAllBooks();
          allBooks.length = 0;
          allBooks.push(...refreshed);
          render();
        }
      });
    }

    // Bulk Category Change
    const btnBulkCategory = container.querySelector('#btn-bulk-category');
    if (btnBulkCategory) {
      btnBulkCategory.addEventListener('click', async () => {
        const newCat = prompt('Enter new category for selected books:');
        if (newCat) {
          const toUpdate = allBooks.filter(b => selectedBookIds.has(b.id));
          toUpdate.forEach(b => b.category = newCat.trim());
          await saveBooksBatch(toUpdate);
          selectedBookIds.clear();
          render();
        }
      });
    }

    // Bulk Status Change
    const btnBulkStatus = container.querySelector('#btn-bulk-status');
    if (btnBulkStatus) {
      btnBulkStatus.addEventListener('click', async () => {
        const newStatus = prompt('Enter new status (unread / reading / finished / paused):', 'finished');
        if (newStatus && ['unread', 'reading', 'finished', 'paused'].includes(newStatus.toLowerCase())) {
          const toUpdate = allBooks.filter(b => selectedBookIds.has(b.id));
          toUpdate.forEach(b => b.status = newStatus.toLowerCase());
          await saveBooksBatch(toUpdate);
          selectedBookIds.clear();
          render();
        }
      });
    }
  }

  render();
}

/**
 * Filter books based on search query (with Arabic normalization) & active filters
 */
function filterBooks(books) {
  const normQuery = normalizeSearch(searchQuery);

  return books.filter(b => {
    // 1. Search Query filter
    if (normQuery) {
      const normTitle = normalizeSearch(b.title);
      const normSubtitle = normalizeSearch(b.subtitle || '');
      const normAuthors = normalizeSearch((b.authors || []).join(' '));
      const normIsbn = (b.isbn || '').replace(/[^0-9X]/gi, '');
      const normCat = normalizeSearch(b.category || '');
      const normTags = normalizeSearch((b.tags || []).join(' '));

      const matches =
        normTitle.includes(normQuery) ||
        normSubtitle.includes(normQuery) ||
        normAuthors.includes(normQuery) ||
        normIsbn.includes(normQuery) ||
        normCat.includes(normQuery) ||
        normTags.includes(normQuery);

      if (!matches) return false;
    }

    // 2. Status filter
    if (activeFilters.status !== 'all') {
      if (activeFilters.status === 'loaned') {
        if (!b.loan || !b.loan.isLoaned) return false;
      } else if (b.status !== activeFilters.status) {
        return false;
      }
    }

    // 3. Category filter
    if (activeFilters.category !== 'all' && b.category !== activeFilters.category) {
      return false;
    }

    // 4. Language filter
    if (activeFilters.language !== 'all' && b.language !== activeFilters.language) {
      return false;
    }

    // 5. Favorites filter
    if (activeFilters.favoritesOnly && !b.isFavorite) {
      return false;
    }

    // 6. Shelf filter (from library map)
    if (activeFilters.shelf !== 'all') {
      const locKey = [b.location?.room, b.location?.cabinet, b.location?.shelf].filter(Boolean).join(' > ');
      if (locKey !== activeFilters.shelf) return false;
    }

    return true;
  });
}

function sortBooks(books) {
  return [...books].sort((a, b) => {
    let comparison = 0;
    if (currentSort === 'title') {
      comparison = (a.title || '').localeCompare(b.title || '');
    } else if (currentSort === 'author') {
      const aAuth = (a.authors && a.authors[0]) || '';
      const bAuth = (b.authors && b.authors[0]) || '';
      comparison = aAuth.localeCompare(bAuth);
    } else if (currentSort === 'dateAdded') {
      comparison = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    } else if (currentSort === 'year') {
      comparison = (parseInt(a.publicationYear, 10) || 0) - (parseInt(b.publicationYear, 10) || 0);
    } else if (currentSort === 'rating') {
      comparison = (a.rating || 0) - (b.rating || 0);
    }
    return currentSortOrder === 'asc' ? comparison : -comparison;
  });
}

function groupBooksIntoShelves(books) {
  // If user filtered by category, partition in shelves of 16-20 books
  const SHELF_SIZE = 18;
  if (books.length <= SHELF_SIZE) {
    return [{ name: t('navLibrary'), books }];
  }

  // Group by category if all categories are visible
  if (activeFilters.category === 'all') {
    const catMap = new Map();
    books.forEach(b => {
      const cat = b.category || 'General';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat).push(b);
    });

    const shelves = [];
    catMap.forEach((catBooks, catName) => {
      const localizedCat = getCategoryLabel(catName, isRTL() ? 'ar' : 'en');
      // Chunk large categories
      for (let i = 0; i < catBooks.length; i += SHELF_SIZE) {
        const chunk = catBooks.slice(i, i + SHELF_SIZE);
        const shelfNum = Math.floor(i / SHELF_SIZE) + 1;
        const chunkLabel = catBooks.length > SHELF_SIZE 
          ? `${localizedCat} (${formatNumber(shelfNum)})` 
          : localizedCat;
        shelves.push({ name: chunkLabel, books: chunk });
      }
    });
    return shelves;
  }

  // Otherwise chunk into Shelf 1, Shelf 2, etc.
  const shelves = [];
  for (let i = 0; i < books.length; i += SHELF_SIZE) {
    const chunk = books.slice(i, i + SHELF_SIZE);
    const shelfNum = Math.floor(i / SHELF_SIZE) + 1;
    shelves.push({ name: `${t('shelf')} ${formatNumber(shelfNum)}`, books: chunk });
  }
  return shelves;
}

function getUniqueCategories(books) {
  const set = new Set();
  books.forEach(b => {
    if (b.category) set.add(b.category);
  });
  return Array.from(set).sort();
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
