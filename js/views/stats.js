/**
 * stats.js - Analytics & Insights Engine
 * Renders SVG and CSS data visualizations for categories, languages,
 * publishers, top authors, monthly library velocity, read ratios, and financial value.
 */

import { getAllBooks, getSetting } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';
import { getCategoryColor } from '../models.js';

export async function renderStatsView(container, navigateTo) {
  const books = await getAllBooks();
  const yearlyGoal = await getSetting('yearlyReadingGoal', 24);
  const streak = await getSetting('readingStreak', 7);

  // 1. Read percentage
  const total = books.length || 1;
  const finished = books.filter(b => b.status === 'finished').length;
  const reading = books.filter(b => b.status === 'reading').length;
  const unread = books.filter(b => b.status === 'unread').length;
  const readRatio = Math.round((finished / total) * 100);

  // 2. Categories breakdown
  const catCount = {};
  books.forEach(b => {
    const c = b.category || 'General';
    catCount[c] = (catCount[c] || 0) + 1;
  });
  const topCategories = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  // 3. Languages breakdown
  const langCount = {};
  books.forEach(b => {
    const l = b.language || 'en';
    langCount[l] = (langCount[l] || 0) + 1;
  });

  // 4. Top publishers
  const pubCount = {};
  books.forEach(b => {
    if (b.publisher) {
      pubCount[b.publisher] = (pubCount[b.publisher] || 0) + 1;
    }
  });
  const topPublishers = Object.entries(pubCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // 5. Top authors
  const authorCount = {};
  books.forEach(b => {
    (b.authors || []).forEach(a => {
      authorCount[a] = (authorCount[a] || 0) + 1;
    });
  });
  const topAuthors = Object.entries(authorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // 6. Total financial value
  let totalValue = 0;
  let currency = 'USD';
  books.forEach(b => {
    if (b.purchasePrice) {
      totalValue += b.purchasePrice * (b.copies || 1);
      if (b.currency) currency = b.currency;
    }
  });

  // 7. Monthly pace
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const remainingMonths = Math.max(1, 12 - currentMonth);
  const paceNeeded = Math.max(0, Math.ceil((yearlyGoal - finished) / remainingMonths));

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin: 0;">📊 ${t('statsTitle')}</h2>
      </div>

      <!-- Highlights row -->
      <div class="stats-cards-grid" style="margin-bottom: var(--space-xl);">
        <div class="stat-card">
          <span class="stat-card-number">${formatNumber(finished)} / ${formatNumber(total)}</span>
          <span class="stat-card-label">${t('chartReadRatio')} (${readRatio}%)</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-number" style="color: #22c55e;">${formatNumber(totalValue.toFixed(0))} ${currency}</span>
          <span class="stat-card-label">${t('totalLibraryValue')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-number" style="color: #f59e0b;">🔥 ${formatNumber(streak)}</span>
          <span class="stat-card-label">${t('streakTitle')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-number">${formatNumber(paceNeeded)}</span>
          <span class="stat-card-label">${t('goalBehind', { needed: formatNumber(paceNeeded) })}</span>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="analytics-grid">
        <!-- 1. Categories Distribution -->
        <div class="chart-card">
          <h3 class="chart-card-title">📚 ${t('chartCategories')}</h3>
          <div>
            ${topCategories.map(([cat, count]) => {
              const pct = Math.round((count / total) * 100);
              const color = getCategoryColor(cat);
              return `
                <div class="bar-chart-row">
                  <span class="bar-chart-label" title="${escapeHtml(cat)}">${escapeHtml(cat)}</span>
                  <div class="bar-chart-track">
                    <div class="bar-chart-bar" style="width: ${pct}%; background-color: ${color};"></div>
                  </div>
                  <span style="font-size: 0.75rem; width: 45px; text-align: end;">${formatNumber(count)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. Language Breakdown -->
        <div class="chart-card">
          <h3 class="chart-card-title">🌐 ${t('chartLanguages')}</h3>
          <div>
            ${Object.entries(langCount).map(([lang, count]) => {
              const pct = Math.round((count / total) * 100);
              const langLabel = lang === 'ar' ? 'العربية' : (lang === 'en' ? 'English' : lang);
              return `
                <div class="bar-chart-row">
                  <span class="bar-chart-label">${langLabel}</span>
                  <div class="bar-chart-track">
                    <div class="bar-chart-bar" style="width: ${pct}%; background-color: var(--accent-gold);"></div>
                  </div>
                  <span style="font-size: 0.75rem; width: 45px; text-align: end;">${formatNumber(count)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. Top Authors -->
        <div class="chart-card">
          <h3 class="chart-card-title">✍️ ${t('chartTopAuthors')}</h3>
          <div>
            ${topAuthors.map(([author, count]) => {
              const maxCount = topAuthors[0][1] || 1;
              const pct = Math.round((count / maxCount) * 100);
              return `
                <div class="bar-chart-row">
                  <span class="bar-chart-label" title="${escapeHtml(author)}">${escapeHtml(author)}</span>
                  <div class="bar-chart-track">
                    <div class="bar-chart-bar" style="width: ${pct}%; background-color: #3b82f6;"></div>
                  </div>
                  <span style="font-size: 0.75rem; width: 45px; text-align: end;">${formatNumber(count)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 4. Top Publishers -->
        <div class="chart-card">
          <h3 class="chart-card-title">🏢 ${t('chartPublishers')}</h3>
          <div>
            ${topPublishers.map(([pub, count]) => {
              const maxCount = topPublishers[0][1] || 1;
              const pct = Math.round((count / maxCount) * 100);
              return `
                <div class="bar-chart-row">
                  <span class="bar-chart-label" title="${escapeHtml(pub)}">${escapeHtml(pub)}</span>
                  <div class="bar-chart-track">
                    <div class="bar-chart-bar" style="width: ${pct}%; background-color: #8b5cf6;"></div>
                  </div>
                  <span style="font-size: 0.75rem; width: 45px; text-align: end;">${formatNumber(count)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
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
