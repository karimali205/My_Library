/**
 * home.js - Home screen dashboard
 * Displays quick stats, continue reading, reading goal pace, random suggestion,
 * overdue loan alerts, reading streak, and backup reminders.
 */

import { getAllBooks, getSetting } from '../db.js';
import { t, isRTL, formatDate, formatNumber } from '../i18n.js';
import { createStyledCoverHTML } from '../utils/spine-generator.js';

export async function renderHomeView(container, navigateTo) {
  const books = await getAllBooks();
  const yearlyGoal = await getSetting('yearlyReadingGoal', 24);
  const lastBackupDate = await getSetting('lastBackupDate', null);
  const streakCount = await getSetting('readingStreak', 7);

  // Calculate statistics
  const totalBooks = books.length;
  const readBooks = books.filter(b => b.status === 'finished');
  const readingBooks = books.filter(b => b.status === 'reading');
  const loanedBooks = books.filter(b => b.loan && b.loan.isLoaned);

  // Check overdue loans
  const now = new Date();
  const overdueLoans = loanedBooks.filter(b => {
    if (!b.loan.expectedReturn) return false;
    return new Date(b.loan.expectedReturn) < now;
  });

  // Yearly reading goal pace
  const currentYear = now.getFullYear();
  const readThisYear = readBooks.filter(b => {
    if (!b.finishDate) return true;
    return new Date(b.finishDate).getFullYear() === currentYear;
  }).length;

  const goalPercent = Math.min(100, Math.round((readThisYear / (yearlyGoal || 1)) * 100));
  const currentMonth = now.getMonth() + 1; // 1-12
  const expectedPace = Math.round((yearlyGoal / 12) * currentMonth);
  const booksNeededPerMonth = Math.max(0, Math.ceil((yearlyGoal - readThisYear) / Math.max(1, 12 - currentMonth)));

  // Recently added books
  const recentlyAdded = [...books]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  // Random unread suggestion
  const unreadBooks = books.filter(b => b.status === 'unread');
  let randomBook = unreadBooks.length > 0
    ? unreadBooks[Math.floor(Math.random() * unreadBooks.length)]
    : (books.length > 0 ? books[Math.floor(Math.random() * books.length)] : null);

  container.innerHTML = `
    <div class="view-container">
      <!-- Overdue Loans Alert Banner -->
      ${overdueLoans.length > 0 ? `
        <div class="banner-alert" style="background: rgba(185, 28, 28, 0.15); border: 1px solid #b91c1c; border-radius: var(--radius-lg); padding: var(--space-md); margin-bottom: var(--space-lg); display: flex; align-items: center; justify-content: space-between; gap: var(--space-md);">
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span style="font-size: 1.5rem;">⚠️</span>
            <div>
              <strong style="color: #ef4444;">${t('overdueLoansAlert')}</strong>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${overdueLoans.map(b => `${b.title} (${b.loan.borrower})`).join(' • ')}
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" id="btn-view-loans">${t('navLoans')}</button>
        </div>
      ` : ''}

      <!-- Quick Stats Cards -->
      <div class="stats-cards-grid">
        <div class="stat-card" data-filter="all">
          <span class="stat-card-number">${formatNumber(totalBooks)}</span>
          <span class="stat-card-label">${t('statsTotalBooks')}</span>
        </div>
        <div class="stat-card" data-filter="finished">
          <span class="stat-card-number" style="color: #52b788;">${formatNumber(readBooks.length)}</span>
          <span class="stat-card-label">${t('statsReadBooks')}</span>
        </div>
        <div class="stat-card" data-filter="reading">
          <span class="stat-card-number" style="color: var(--accent-gold);">${formatNumber(readingBooks.length)}</span>
          <span class="stat-card-label">${t('statsReadingBooks')}</span>
        </div>
        <div class="stat-card" data-filter="loaned">
          <span class="stat-card-number" style="color: #60a5fa;">${formatNumber(loanedBooks.length)}</span>
          <span class="stat-card-label">${t('statsOnLoan')}</span>
        </div>
      </div>

      <!-- Yearly Reading Goal Widget -->
      <div class="goal-progress-widget">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-xs);">
          <div>
            <h3 style="font-size: 1.1rem; color: var(--accent-gold); margin: 0;">${t('readingGoal')} (${currentYear})</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 2px 0 0 0;">
              ${t('goalPace', { current: formatNumber(readThisYear), target: formatNumber(yearlyGoal), percent: formatNumber(goalPercent) })}
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b;">
              🔥 ${t('streakDays', { count: formatNumber(streakCount) })}
            </span>
          </div>
        </div>
        
        <div class="goal-progress-bar-bg">
          <div class="goal-progress-bar-fill" style="width: ${goalPercent}%;"></div>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>${readThisYear >= expectedPace ? t('goalOnTrack') : t('goalBehind', { needed: formatNumber(booksNeededPerMonth) })}</span>
          <button class="btn btn-sm btn-icon" id="btn-edit-goal" title="Edit Goal" style="border: none; padding: 0;">⚙️</button>
        </div>
      </div>

      <!-- Continue Reading Section (if any books are currently reading) -->
      ${readingBooks.length > 0 ? `
        <div style="margin-bottom: var(--space-xl);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm);">
            <h3 style="font-size: 1.15rem; color: var(--accent-gold);">${t('continueReading')}</h3>
          </div>
          <div class="horizontal-scroll-shelf">
            ${readingBooks.map(b => {
              const pagesTotal = b.pageCount || 100;
              const readPercent = Math.min(100, Math.round(((b.currentPage || 0) / pagesTotal) * 100));
              return `
                <div class="continue-reading-card" data-book-id="${b.id}">
                  <div class="continue-card-cover">
                    ${b.coverImage ? `<img src="${b.coverImage}" alt="${b.title}" style="width:100%;height:100%;object-fit:cover;">` : createStyledCoverHTML(b, 'small')}
                  </div>
                  <div class="continue-card-info">
                    <div>
                      <h4 style="font-size: 0.9rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.title}</h4>
                      <p style="font-size: 0.75rem; color: var(--text-muted);">${(b.authors || []).join(', ')}</p>
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>p. ${formatNumber(b.currentPage || 0)} / ${formatNumber(b.pageCount || '?')}</span>
                        <span>${formatNumber(readPercent)}%</span>
                      </div>
                      <div style="width: 100%; height: 6px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden;">
                        <div style="height: 100%; width: ${readPercent}%; background: var(--accent-gold);"></div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Random Unread Suggestion -->
      ${randomBook ? `
        <div class="suggestion-banner">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-gold); font-weight: bold; letter-spacing: 1px;">
                ✨ ${t('randomSuggestion')}
              </span>
              <h3 style="font-size: 1.3rem; margin: 4px 0 2px 0;">${randomBook.title}</h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">
                ${(randomBook.authors || []).join(', ')} • ${randomBook.category || ''}
              </p>
              ${randomBook.review ? `<p style="font-size: 0.85rem; font-style: italic; color: var(--text-muted); margin-bottom: var(--space-sm);">"${randomBook.review}"</p>` : ''}
              <div style="display: flex; gap: var(--space-sm); align-items: center;">
                <button class="btn btn-sm btn-primary" id="btn-open-random" data-book-id="${randomBook.id}">${t('openBook')}</button>
                <button class="btn btn-sm btn-secondary" id="btn-reroll-random">🎲 ${t('suggestAnother')}</button>
              </div>
            </div>
            <div style="width: 80px; height: 120px; flex-shrink: 0; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
              ${randomBook.coverImage ? `<img src="${randomBook.coverImage}" alt="${randomBook.title}" style="width:100%;height:100%;object-fit:cover;">` : createStyledCoverHTML(randomBook, 'small')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Recently Added Books Carousel -->
      <div style="margin-bottom: var(--space-xl);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm);">
          <h3 style="font-size: 1.15rem; color: var(--accent-gold);">${t('recentlyAdded')}</h3>
          <button class="btn btn-sm btn-secondary" id="btn-view-all-library">${t('view')} ${t('all')}</button>
        </div>
        <div class="horizontal-scroll-shelf">
          ${recentlyAdded.map(b => `
            <div class="continue-reading-card" data-book-id="${b.id}" style="flex: 0 0 200px; flex-direction: column;">
              <div style="width: 100%; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; margin-bottom: var(--space-xs);">
                ${b.coverImage ? `<img src="${b.coverImage}" alt="${b.title}" style="width:100%;height:100%;object-fit:cover;">` : createStyledCoverHTML(b, 'small')}
              </div>
              <h4 style="font-size: 0.85rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.title}</h4>
              <p style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${(b.authors || []).join(', ')}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Last Backup Status Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-md); background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.85rem;">
        <div style="display: flex; align-items: center; gap: var(--space-sm);">
          <span>💾</span>
          <div>
            <strong>${t('lastBackup')}:</strong>
            <span style="color: var(--text-muted);">${lastBackupDate ? formatDate(lastBackupDate) : t('noBackupYet')}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-brass" id="btn-home-backup">${t('backupNow')}</button>
      </div>
    </div>
  `;

  // Attach event listeners
  container.querySelectorAll('[data-book-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.bookId;
      navigateTo('book-details', { bookId: id });
    });
  });

  const btnViewLoans = container.querySelector('#btn-view-loans');
  if (btnViewLoans) btnViewLoans.addEventListener('click', () => navigateTo('loans'));

  const btnViewAll = container.querySelector('#btn-view-all-library');
  if (btnViewAll) btnViewAll.addEventListener('click', () => navigateTo('library'));

  const btnReroll = container.querySelector('#btn-reroll-random');
  if (btnReroll) btnReroll.addEventListener('click', () => renderHomeView(container, navigateTo));

  const btnBackup = container.querySelector('#btn-home-backup');
  if (btnBackup) btnBackup.addEventListener('click', () => navigateTo('settings', { tab: 'backups' }));

  const btnEditGoal = container.querySelector('#btn-edit-goal');
  if (btnEditGoal) btnEditGoal.addEventListener('click', () => navigateTo('settings'));

  // Quick stat cards filter navigation
  container.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      navigateTo('library', { statusFilter: filter });
    });
  });
}
