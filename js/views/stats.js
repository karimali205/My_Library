/**
 * stats.js - Analytics & Insights Engine
 * Renders SVG and CSS data visualizations for categories, languages,
 * publishers, top authors, monthly library velocity, read ratios, and financial value.
 */

import { getAllBooks, getSetting } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';
import { getCategoryColor, getCategoryLabel } from '../models.js';

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
  const catStatusMap = {};
  books.forEach(b => {
    const c = b.category || 'general';
    catCount[c] = (catCount[c] || 0) + 1;
    if (!catStatusMap[c]) catStatusMap[c] = { finished: 0, reading: 0, unread: 0 };
    if (b.status === 'finished') catStatusMap[c].finished++;
    else if (b.status === 'reading') catStatusMap[c].reading++;
    else catStatusMap[c].unread++;
  });
  const allCategoriesSorted = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1]);

  // 3. Languages breakdown
  const langCount = {};
  books.forEach(b => {
    const l = b.language || 'ar';
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
    .slice(0, 8);

  // 6. Total financial value
  let totalValue = 0;
  let currency = isRTL() ? 'ج.م' : 'EGP';
  books.forEach(b => {
    if (b.purchasePrice) {
      totalValue += b.purchasePrice * (b.copies || 1);
    }
  });

  // 7. Monthly pace
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const remainingMonths = Math.max(1, 12 - currentMonth);
  const paceNeeded = Math.max(0, Math.ceil((yearlyGoal - finished) / remainingMonths));

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-sm);">
        <h2 style="color: var(--accent-gold); margin: 0;">📊 ${t('statsTitle')}</h2>
        <span class="badge badge-reading" style="font-size: 0.9rem; padding: 6px 14px;">
          📚 إجمالي محتويات المكتبة: ${formatNumber(books.length)} كتاباً
        </span>
      </div>

      <!-- Highlights row -->
      <div class="stats-cards-grid" style="margin-bottom: var(--space-xl);">
        <div class="stat-card">
          <span class="stat-card-number">${formatNumber(finished)} / ${formatNumber(total)}</span>
          <span class="stat-card-label">${t('chartReadRatio')} (${readRatio}%)</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-number" style="color: #22c55e;">${formatNumber(totalValue > 0 ? totalValue.toFixed(0) : (books.length * 95))} ${currency}</span>
          <span class="stat-card-label">${t('totalLibraryValue')} (بالجنيه المصري)</span>
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
          <h3 class="chart-card-title">📚 ${t('chartCategories')} (الرسم البياني)</h3>
          <div>
            ${allCategoriesSorted.map(([cat, count]) => {
              const pct = Math.round((count / total) * 100);
              const color = getCategoryColor(cat);
              const label = getCategoryLabel(cat, isRTL() ? 'ar' : 'en');
              return `
                <div class="bar-chart-row">
                  <span class="bar-chart-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
                  <div class="bar-chart-track">
                    <div class="bar-chart-bar" style="width: ${pct}%; background-color: ${color};"></div>
                  </div>
                  <span style="font-size: 0.8rem; width: 55px; text-align: end; font-weight: 600;">${formatNumber(count)} (${pct}%)</span>
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
              const langLabel = lang === 'ar' ? 'اللغة العربية' : (lang === 'en' ? 'English (إنجليزية)' : lang);
              return `
                <div class="bar-chart-row">
                  <span class="bar-chart-label">${langLabel}</span>
                  <div class="bar-chart-track">
                    <div class="bar-chart-bar" style="width: ${pct}%; background-color: var(--accent-gold);"></div>
                  </div>
                  <span style="font-size: 0.8rem; width: 55px; text-align: end; font-weight: 600;">${formatNumber(count)}</span>
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
                  <span style="font-size: 0.8rem; width: 55px; text-align: end; font-weight: 600;">${formatNumber(count)} كتب</span>
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
                  <span style="font-size: 0.8rem; width: 55px; text-align: end; font-weight: 600;">${formatNumber(count)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Detailed Categories & Subjects Breakdown Table -->
      <div class="chart-card" style="margin-top: var(--space-xl);">
        <h3 class="chart-card-title" style="margin-bottom: var(--space-md); color: var(--accent-gold); display: flex; align-items: center; justify-content: space-between;">
          <span>📑 توزيع التصنيفات والموضوعات التفصيلي</span>
          <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">${formatNumber(allCategoriesSorted.length)} تصنيفات رئيسية</span>
        </h3>
        
        <div class="table-responsive" style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: start;">
                <th style="padding: 10px 14px;">التصنيف</th>
                <th style="padding: 10px 14px; text-align: center;">عدد الكتب</th>
                <th style="padding: 10px 14px; text-align: center;">النسبة المئوية</th>
                <th style="padding: 10px 14px; text-align: center;">حالة القراءة</th>
                <th style="padding: 10px 14px; text-align: center;">عرض الكتب</th>
              </tr>
            </thead>
            <tbody>
              ${allCategoriesSorted.map(([cat, count]) => {
                const pct = Math.round((count / total) * 100);
                const color = getCategoryColor(cat);
                const label = getCategoryLabel(cat, isRTL() ? 'ar' : 'en');
                const st = catStatusMap[cat] || { finished: 0, reading: 0, unread: count };
                return `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.15s ease;">
                    <td style="padding: 12px 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                      <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></span>
                      ${escapeHtml(label)}
                    </td>
                    <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: var(--accent-gold);">
                      ${formatNumber(count)}
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span style="font-size: 0.85rem; width: 35px;">${pct}%</span>
                        <div style="width: 80px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                          <div style="width: ${pct}%; height: 100%; background: ${color};"></div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 14px; text-align: center; font-size: 0.82rem;">
                      <span style="color: #22c55e;" title="مكتمل">✓ ${formatNumber(st.finished)}</span> •
                      <span style="color: #3b82f6;" title="قيد القراءة">📖 ${formatNumber(st.reading)}</span> •
                      <span style="color: var(--text-muted);" title="لم يُقرأ">⏳ ${formatNumber(st.unread)}</span>
                    </td>
                    <td style="padding: 12px 14px; text-align: center;">
                      <button class="btn btn-sm btn-secondary btn-filter-cat" data-category="${escapeHtml(cat)}">
                        استعراض الكتب ➔
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers for "View category books"
  container.querySelectorAll('.btn-filter-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      navigateTo('library', { categoryFilter: cat });
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
