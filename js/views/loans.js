/**
 * loans.js - Lending Tracker View
 * Tracks currently borrowed books, alerts on overdue loans,
 * allows one-click return, and displays archive of past loans.
 */

import { getAllBooks, saveBook } from '../db.js';
import { t, isRTL, formatDate, formatNumber } from '../i18n.js';

export async function renderLoansView(container, navigateTo) {
  const books = await getAllBooks();
  const loanedBooks = books.filter(b => b.loan && b.loan.isLoaned);

  // Collect loan history archives
  const historyEntries = [];
  books.forEach(b => {
    (b.loanHistory || []).forEach(h => {
      historyEntries.push({
        bookTitle: b.title,
        bookId: b.id,
        ...h
      });
    });
  });
  historyEntries.sort((a, b) => new Date(b.returnDate || 0) - new Date(a.returnDate || 0));

  const now = new Date();

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin: 0;">🤝 ${t('loansTitle')}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
          ${t('activeLoans')}: ${formatNumber(loanedBooks.length)}
        </p>
      </div>

      <!-- Active Loans Section -->
      <div style="margin-bottom: var(--space-xl);">
        <h3 style="font-size: 1.15rem; color: var(--accent-gold); margin-bottom: var(--space-md);">${t('activeLoans')}</h3>
        ${loanedBooks.length === 0 ? `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-xl); text-align: center; color: var(--text-muted);">
            ✓ All books are currently safe in your library. No active loans!
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md);">
            ${loanedBooks.map(b => {
              const isOverdue = b.loan.expectedReturn && new Date(b.loan.expectedReturn) < now;
              const daysDiff = isOverdue
                ? Math.ceil((now - new Date(b.loan.expectedReturn)) / (1000 * 60 * 60 * 24))
                : 0;

              return `
                <div class="stat-card" style="padding: var(--space-md); border-color: ${isOverdue ? '#b91c1c' : 'var(--border-color)'};">
                  ${isOverdue ? `
                    <div style="font-size: 0.75rem; color: #ef4444; font-weight: bold; margin-bottom: 4px;">
                      ⚠️ ${t('overdueWarning', { days: formatNumber(daysDiff) })}
                    </div>
                  ` : ''}

                  <h4 style="font-size: 1rem; margin-bottom: 2px;">${escapeHtml(b.title)}</h4>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: var(--space-sm);">${(b.authors || []).join(', ')}</p>

                  <div style="font-size: 0.85rem; line-height: 1.5; margin-bottom: var(--space-md);">
                    <div><strong>${t('borrowerName')}:</strong> <span style="color: var(--accent-gold);">${escapeHtml(b.loan.borrower)}</span></div>
                    <div><strong>${t('loanDate')}:</strong> ${formatDate(b.loan.loanDate)}</div>
                    <div><strong>${t('expectedReturnDate')}:</strong> ${formatDate(b.loan.expectedReturn)}</div>
                    ${b.loan.notes ? `<div><strong>${t('loanNotes')}:</strong> ${escapeHtml(b.loan.notes)}</div>` : ''}
                  </div>

                  <div style="display: flex; gap: var(--space-xs); margin-top: auto;">
                    <button class="btn btn-sm btn-brass btn-return-action" data-book-id="${b.id}" style="flex: 1;">
                      ✓ ${t('markReturned')}
                    </button>
                    <button class="btn btn-sm btn-secondary btn-view-action" data-book-id="${b.id}">
                      ${t('view')}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Past Loans Archive -->
      <div>
        <h3 style="font-size: 1.15rem; color: var(--accent-gold); margin-bottom: var(--space-md);">${t('pastLoans')}</h3>
        ${historyEntries.length === 0 ? `
          <div style="color: var(--text-muted); font-size: 0.85rem;">No historical records yet.</div>
        ` : `
          <div class="table-container">
            <table class="books-table">
              <thead>
                <tr>
                  <th>${t('bookTitle')}</th>
                  <th>${t('borrowerName')}</th>
                  <th>${t('loanDate')}</th>
                  <th>Return Date</th>
                </tr>
              </thead>
              <tbody>
                ${historyEntries.map(h => `
                  <tr>
                    <td><strong>${escapeHtml(h.bookTitle)}</strong></td>
                    <td>${escapeHtml(h.borrower)}</td>
                    <td>${formatDate(h.loanDate)}</td>
                    <td>${formatDate(h.returnDate)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;

  // Attach actions
  container.querySelectorAll('.btn-return-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bId = btn.dataset.bookId;
      const b = books.find(x => x.id === bId);
      if (b && confirm(t('markReturned') + '?')) {
        if (!b.loanHistory) b.loanHistory = [];
        b.loanHistory.push({
          borrower: b.loan.borrower,
          loanDate: b.loan.loanDate,
          returnDate: new Date().toISOString(),
          notes: b.loan.notes
        });
        b.loan = { isLoaned: false };
        await saveBook(b);
        renderLoansView(container, navigateTo);
      }
    });
  });

  container.querySelectorAll('.btn-view-action').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo('book-details', { bookId: btn.dataset.bookId });
    });
  });
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
