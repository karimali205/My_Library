/**
 * settings.js - Comprehensive Settings & Configuration Screen
 * Language, 5 themes & modes, fonts, shelf styling, persistent storage request,
 * JSON/CSV export/import, private GitHub repository sync, snapshots rollback,
 * PIN lock, and data reset danger zone.
 */

import {
  getAllBooks,
  saveBooksBatch,
  getSnapshots,
  restoreSnapshot,
  createSnapshot,
  removeSampleBooks,
  wipeAllData,
  checkStoragePersistence,
  requestStoragePersistence,
  getStorageEstimate,
  getSetting,
  setSetting
} from '../db.js';
import { t, setLanguage, getLanguage, isRTL, formatDate, formatNumber } from '../i18n.js';
import { getThemeState, updateThemeState, THEMES } from '../themes.js';
import { exportBooksToCSV, parseCSV, mapRowsToBooks, downloadFile } from '../utils/csv-excel.js';
import { pushToGitHub, pullFromGitHub } from '../utils/github-sync.js';
import { printCatalog } from '../utils/print.js';
import { searchBookCover } from '../utils/cover-fetcher.js';

export async function renderSettingsView(container, navigateTo, params = {}) {
  const books = await getAllBooks(true);
  const themeState = getThemeState();
  const currentLang = getLanguage();
  const isPersisted = await checkStoragePersistence();
  const storageUsage = await getStorageEstimate();
  const snapshots = await getSnapshots();

  // Settings values
  const yearlyGoal = await getSetting('yearlyReadingGoal', 24);
  const defaultCurrency = await getSetting('defaultCurrency', 'EGP');
  const ghToken = await getSetting('githubToken', '');
  const ghRepo = await getSetting('githubRepo', '');
  const lastSyncTime = await getSetting('githubLastSync', null);
  const pinCode = await getSetting('pinCode', '');

  let activeTab = params.tab || 'appearance'; // 'appearance' | 'backups' | 'sync' | 'security' | 'danger'

  function render() {
    container.innerHTML = `
      <div class="view-container" style="max-width: 900px;">
        <div style="margin-bottom: var(--space-lg);">
          <h2 style="color: var(--accent-gold); margin: 0;">⚙️ ${t('settingsTitle')}</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            ${t('appVersion')} • ${books.filter(b => !b.deletedAt).length} books cataloged
          </p>
        </div>

        <!-- Navigation Tabs -->
        <div class="filter-chips-row" style="margin-bottom: var(--space-lg);">
          <button class="filter-chip ${activeTab === 'appearance' ? 'active' : ''}" data-tab="appearance">
            🎨 ${t('generalSettings')}
          </button>
          <button class="filter-chip ${activeTab === 'backups' ? 'active' : ''}" data-tab="backups">
            💾 ${t('dataSafetySection')}
          </button>
          <button class="filter-chip ${activeTab === 'sync' ? 'active' : ''}" data-tab="sync">
            ☁️ ${t('githubSyncTitle')}
          </button>
          <button class="filter-chip ${activeTab === 'security' ? 'active' : ''}" data-tab="security">
            🔒 ${t('privacySection')}
          </button>
          <button class="filter-chip ${activeTab === 'danger' ? 'active' : ''}" data-tab="danger" style="color: #ef4444;">
            ⚠️ ${t('dangerZone')}
          </button>
        </div>

        <div id="settings-tab-mount">
          ${renderTabContent()}
        </div>
      </div>
    `;

    attachEvents();
  }

  function renderTabContent() {
    if (activeTab === 'appearance') {
      return `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          <!-- 1. Language -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🌐 ${t('appLanguage')}</span></div>
            <div class="accordion-content">
              <div class="form-group col-span-full">
                <select id="setting-language" class="form-control">
                  <option value="ar" ${currentLang === 'ar' ? 'selected' : ''}>العربية (Arabic) - واجهة من اليمين لليسار RTL</option>
                  <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English - Left to Right LTR</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 2. Visual Theme & Light/Dark Mode -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🎨 ${t('themeChoice')}</span></div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('themeChoice')}</label>
                <select id="setting-theme" class="form-control">
                  ${THEMES.map(th => `
                    <option value="${th.id}" ${themeState.theme === th.id ? 'selected' : ''}>
                      ${isRTL() ? th.nameAr : th.nameEn}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('colorMode')}</label>
                <select id="setting-mode" class="form-control">
                  <option value="dark" ${themeState.mode === 'dark' ? 'selected' : ''}>🕯️ ${t('modeDark')}</option>
                  <option value="light" ${themeState.mode === 'light' ? 'selected' : ''}>☀️ ${t('modeLight')}</option>
                  <option value="auto" ${themeState.mode === 'auto' ? 'selected' : ''}>🔄 Follow System</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('shelfStyle')}</label>
                <select id="setting-shelf-style" class="form-control">
                  <option value="wood" ${themeState.shelfStyle === 'wood' ? 'selected' : ''}>🪵 ${t('shelfStyleWood')}</option>
                  <option value="minimal" ${themeState.shelfStyle === 'minimal' ? 'selected' : ''}>⬜ ${t('shelfStyleMinimal')}</option>
                  <option value="glass" ${themeState.shelfStyle === 'glass' ? 'selected' : ''}>🪟 ${t('shelfStyleGlass')}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('densityLabel')}</label>
                <select id="setting-density" class="form-control">
                  <option value="compact" ${themeState.density === 'compact' ? 'selected' : ''}>${t('densityCompact')}</option>
                  <option value="comfortable" ${themeState.density === 'comfortable' ? 'selected' : ''}>${t('densityComfortable')}</option>
                  <option value="spacious" ${themeState.density === 'spacious' ? 'selected' : ''}>${t('densitySpacious')}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('customAccent')}</label>
                <input type="color" id="setting-accent-color" class="form-control" value="${themeState.customAccent || '#c59b27'}" style="height: 44px; padding: 2px;">
              </div>

              <div class="form-group">
                <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 28px;">
                  <input type="checkbox" id="setting-animations" ${themeState.animations !== false ? 'checked' : ''} style="width: 18px; height: 18px;">
                  <span>${t('enableAnimations')}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 3. Fonts & Typography -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🔤 ${t('arabicFont')} & ${t('englishFont')}</span></div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('arabicFont')}</label>
                <select id="setting-font-ar" class="form-control">
                  <option value="Cairo" ${themeState.arabicFont === 'Cairo' ? 'selected' : ''}>Cairo (حديث ومقروء)</option>
                  <option value="Amiri" ${themeState.arabicFont === 'Amiri' ? 'selected' : ''}>Amiri (نسخي كلاسيكي عريق)</option>
                  <option value="Tajawal" ${themeState.arabicFont === 'Tajawal' ? 'selected' : ''}>Tajawal (أنيق وهادئ)</option>
                  <option value="Noto Naskh Arabic" ${themeState.arabicFont === 'Noto Naskh Arabic' ? 'selected' : ''}>Noto Naskh (رسمي متوازن)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('englishFont')}</label>
                <select id="setting-font-en" class="form-control">
                  <option value="Playfair Display" ${themeState.englishFont === 'Playfair Display' ? 'selected' : ''}>Playfair Display (Classic Serif)</option>
                  <option value="Lora" ${themeState.englishFont === 'Lora' ? 'selected' : ''}>Lora (Warm Editorial)</option>
                  <option value="Inter" ${themeState.englishFont === 'Inter' ? 'selected' : ''}>Inter (Modern Sans)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">${t('fontSize')}</label>
                <select id="setting-font-size" class="form-control">
                  <option value="small" ${themeState.fontSize === 'small' ? 'selected' : ''}>Small (14px)</option>
                  <option value="medium" ${themeState.fontSize === 'medium' ? 'selected' : ''}>Medium (16px - Standard)</option>
                  <option value="large" ${themeState.fontSize === 'large' ? 'selected' : ''}>Large (18px - Comfortable)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 4. Reading Goal & Preferences -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🎯 ${t('readingGoal')} & Defaults</span></div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('readingGoal')} (books / year)</label>
                <input type="number" id="setting-yearly-goal" class="form-control" min="1" value="${yearlyGoal}">
              </div>

              <div class="form-group">
                <label class="form-label">${t('currency')}</label>
                <select id="setting-currency" class="form-control">
                  <option value="USD" ${defaultCurrency === 'USD' ? 'selected' : ''}>USD ($)</option>
                  <option value="EUR" ${defaultCurrency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                  <option value="GBP" ${defaultCurrency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                  <option value="SAR" ${defaultCurrency === 'SAR' ? 'selected' : ''}>SAR (ر.س)</option>
                  <option value="EGP" ${defaultCurrency === 'EGP' ? 'selected' : ''}>EGP (ج.م)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'backups') {
      return `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          <!-- Storage Persistence -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🛡️ ${t('persistentStorageStatus')}</span></div>
            <div class="accordion-content">
              <div class="col-span-full">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-sm);">
                  <div>
                    <strong style="color: ${isPersisted ? '#22c55e' : 'var(--text-secondary)'};">
                      ${isPersisted ? '✓ ' + t('persistentActive') : '⚠️ ' + t('persistentInactive')}
                    </strong>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                      ${t('storageUsed', { size: storageUsage })}
                    </p>
                  </div>
                  ${!isPersisted ? `
                    <button class="btn btn-sm btn-brass" id="btn-request-persist">
                      ${t('requestPersistence')}
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Export & Import JSON / CSV -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>📦 Export & Import</span></div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('export')}</label>
                <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
                  <button class="btn btn-sm btn-secondary" id="btn-export-json">
                    📄 ${t('exportDataJson')}
                  </button>
                  <button class="btn btn-sm btn-secondary" id="btn-export-csv">
                    📊 ${t('exportDataCsv')}
                  </button>
                  <button class="btn btn-sm btn-secondary" id="btn-print-catalog">
                    🖨️ ${t('printCatalogTitle')}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">${t('import')}</label>
                <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
                  <label class="btn btn-sm btn-secondary" style="cursor: pointer;">
                    📥 ${t('importDataJson')}
                    <input type="file" id="file-import-json" accept=".json" style="display: none;">
                  </label>
                  <label class="btn btn-sm btn-secondary" style="cursor: pointer;">
                    📊 ${t('importDataCsv')}
                    <input type="file" id="file-import-csv" accept=".csv" style="display: none;">
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Automatic Snapshots (Rollback Points) -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>⏪ ${t('snapshotsTitle')}</span></div>
            <div class="accordion-content">
              <div class="col-span-full">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                  <span style="font-size: 0.85rem; color: var(--text-muted);">Last 5 automatic checkpoints</span>
                  <button class="btn btn-sm btn-secondary" id="btn-create-snapshot">+ Create Snapshot Now</button>
                </div>

                ${snapshots.length === 0 ? `
                  <p style="color: var(--text-muted); font-size: 0.85rem;">No snapshots recorded yet.</p>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    ${snapshots.map(s => `
                      <div class="stat-card" style="padding: var(--space-sm); display: flex; align-items: center; justify-content: space-between;">
                        <div>
                          <strong>${escapeHtml(s.label || 'Checkpoint')}</strong>
                          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${formatDate(s.date)} • ${s.bookCount} books</span>
                        </div>
                        <button class="btn btn-sm btn-brass btn-restore-snap" data-snap-id="${s.id}">
                          ${t('restoreSnapshot')}
                        </button>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          </div>

          <!-- Batch Book Cover Fetcher -->
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🖼️ جلب أغلفة الكتب أونلاين تلقائياً</span></div>
            <div class="accordion-content">
              <div class="col-span-full">
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-sm);">
                  يمكن للأداة البحث في Google Books و Open Library عن أغلفة كتبك وحفظها مضغوطة محلياً على جهازك لتظهر بدلاً من الأغلفة الافتراضية وتعمل دون إنترنت.
                </p>
                <div style="display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap;">
                  <button class="btn btn-sm btn-brass" id="btn-batch-fetch-covers">
                    🌐 بدء فحص وجلب الأغلفة الناقصة
                  </button>
                  <span id="batch-covers-count-label" style="font-size: 0.8rem; color: var(--text-secondary);">
                    (الكتب غير المغلفة حالياً: ${books.filter(b => !b.deletedAt && !b.coverImage).length})
                  </span>
                </div>
                <div id="batch-covers-progress-box" style="display: none; margin-top: 14px; background: var(--bg-surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                    <span id="batch-covers-status" style="color: var(--accent-gold); font-weight: 600;">جاري التحضير...</span>
                    <span id="batch-covers-pct">0%</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div id="batch-covers-bar" style="width: 0%; height: 100%; background: var(--accent-gold); transition: width 0.2s;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'sync') {
      return `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          <div class="form-section-accordion">
            <div class="accordion-header"><span>☁️ ${t('githubSyncTitle')}</span></div>
            <div class="accordion-content">
              <div class="col-span-full">
                <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: var(--radius-md); padding: var(--space-sm); margin-bottom: var(--space-md); font-size: 0.85rem; color: #f59e0b;">
                  🔒 <strong>${t('githubWarning')}</strong><br>
                  ${t('githubSyncHelp')}
                </div>
              </div>

              <div class="form-group col-span-full">
                <label class="form-label">${t('githubRepo')}</label>
                <input type="text" id="setting-gh-repo" class="form-control" placeholder="e.g. your-username/my-private-library" value="${escapeHtml(ghRepo)}">
              </div>

              <div class="form-group col-span-full">
                <label class="form-label">${t('githubToken')}</label>
                <input type="password" id="setting-gh-token" class="form-control" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value="${escapeHtml(ghToken)}">
              </div>

              <div class="col-span-full" style="display: flex; gap: var(--space-sm); align-items: center; margin-top: var(--space-xs); flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" id="btn-gh-push">
                  ⬆️ ${t('githubSyncNowPush')}
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-gh-pull">
                  ⬇️ ${t('githubSyncNowPull')}
                </button>
                ${lastSyncTime ? `<span style="font-size: 0.8rem; color: var(--text-muted);">${t('githubLastSync', { date: formatDate(lastSyncTime) })}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'security') {
      return `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          <div class="form-section-accordion">
            <div class="accordion-header"><span>🔒 ${t('privacySection')}</span></div>
            <div class="accordion-content">
              <div class="form-group">
                <label class="form-label">${t('setPin')}</label>
                <input type="password" id="setting-pin-code" class="form-control" maxlength="4" placeholder="4 digits (leave empty to disable)" value="${escapeHtml(pinCode)}">
              </div>
              <div class="col-span-full">
                <button class="btn btn-sm btn-primary" id="btn-save-pin">${t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (activeTab === 'danger') {
      return `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          <div class="form-section-accordion" style="border-color: #b91c1c;">
            <div class="accordion-header" style="background: rgba(185, 28, 28, 0.2); color: #ef4444;">
              <span>⚠️ ${t('dangerZone')}</span>
            </div>
            <div class="accordion-content">
              <!-- Clear Sample Data -->
              <div class="col-span-full" style="border-bottom: 1px solid var(--border-color); padding-bottom: var(--space-md); margin-bottom: var(--space-md);">
                <h4>${t('clearSampleData')}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-sm);">
                  Removes the 20 pre-loaded demonstration books. Any books you added yourself remain intact.
                </p>
                <button class="btn btn-sm btn-secondary" id="btn-clear-samples" style="border-color: #f59e0b; color: #f59e0b;">
                  🧹 ${t('clearSampleData')}
                </button>
              </div>

              <!-- Wipe All Data -->
              <div class="col-span-full">
                <h4 style="color: #ef4444;">${t('wipeAllData')}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-sm);">
                  Permanently deletes all books, quotes, lending records, custom themes, and resets database to zero.
                </p>
                <button class="btn btn-sm btn-danger" id="btn-wipe-database">
                  🧨 ${t('wipeAllData')}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  function attachEvents() {
    // Tab switching
    container.querySelectorAll('.filter-chip[data-tab]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeTab = chip.dataset.tab;
        render();
      });
    });

    // Language change (Instant switching, no reload)
    const langSelect = container.querySelector('#setting-language');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
        render();
      });
    }

    // Theme change
    const themeSelect = container.querySelector('#setting-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        updateThemeState({ theme: e.target.value });
      });
    }

    // Mode change
    const modeSelect = container.querySelector('#setting-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        updateThemeState({ mode: e.target.value });
      });
    }

    // Shelf style
    const shelfStyleSelect = container.querySelector('#setting-shelf-style');
    if (shelfStyleSelect) {
      shelfStyleSelect.addEventListener('change', (e) => {
        updateThemeState({ shelfStyle: e.target.value });
      });
    }

    // Density
    const densitySelect = container.querySelector('#setting-density');
    if (densitySelect) {
      densitySelect.addEventListener('change', (e) => {
        updateThemeState({ density: e.target.value });
      });
    }

    // Accent color
    const accentColorInput = container.querySelector('#setting-accent-color');
    if (accentColorInput) {
      accentColorInput.addEventListener('input', (e) => {
        updateThemeState({ customAccent: e.target.value });
      });
    }

    // Animations toggle
    const animCheck = container.querySelector('#setting-animations');
    if (animCheck) {
      animCheck.addEventListener('change', (e) => {
        updateThemeState({ animations: e.target.checked });
      });
    }

    // Fonts
    const fontArSelect = container.querySelector('#setting-font-ar');
    if (fontArSelect) {
      fontArSelect.addEventListener('change', (e) => {
        updateThemeState({ arabicFont: e.target.value });
      });
    }

    const fontEnSelect = container.querySelector('#setting-font-en');
    if (fontEnSelect) {
      fontEnSelect.addEventListener('change', (e) => {
        updateThemeState({ englishFont: e.target.value });
      });
    }

    const fontSizeSelect = container.querySelector('#setting-font-size');
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', (e) => {
        updateThemeState({ fontSize: e.target.value });
      });
    }

    // Yearly Goal & Currency
    const goalInput = container.querySelector('#setting-yearly-goal');
    if (goalInput) {
      goalInput.addEventListener('change', async (e) => {
        await setSetting('yearlyReadingGoal', parseInt(e.target.value, 10) || 24);
      });
    }

    const currSelect = container.querySelector('#setting-currency');
    if (currSelect) {
      currSelect.addEventListener('change', async (e) => {
        await setSetting('defaultCurrency', e.target.value);
      });
    }

    // Persistent storage request
    const btnPersist = container.querySelector('#btn-request-persist');
    if (btnPersist) {
      btnPersist.addEventListener('click', async () => {
        const granted = await requestStoragePersistence();
        if (granted) alert('Persistent storage granted!');
        renderSettingsView(container, navigateTo, { tab: 'backups' });
      });
    }

    // Export JSON
    const btnExpJson = container.querySelector('#btn-export-json');
    if (btnExpJson) {
      btnExpJson.addEventListener('click', async () => {
        const currentBooks = await getAllBooks(true);
        const exportObj = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          books: currentBooks
        };
        downloadFile(JSON.stringify(exportObj, null, 2), `my-library-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        await setSetting('lastBackupDate', new Date().toISOString());
      });
    }

    // Export CSV
    const btnExpCsv = container.querySelector('#btn-export-csv');
    if (btnExpCsv) {
      btnExpCsv.addEventListener('click', async () => {
        const currentBooks = await getAllBooks(false);
        const csvStr = exportBooksToCSV(currentBooks);
        downloadFile(csvStr, `my-library-catalog-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
      });
    }

    // Print catalog
    const btnPrintCat = container.querySelector('#btn-print-catalog');
    if (btnPrintCat) {
      btnPrintCat.addEventListener('click', async () => {
        const currentBooks = await getAllBooks(false);
        printCatalog(currentBooks, 'Personal Library Complete Catalog');
      });
    }

    // Import JSON
    const fileImportJson = container.querySelector('#file-import-json');
    if (fileImportJson) {
      fileImportJson.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const parsed = JSON.parse(ev.target.result);
              const importedBooks = parsed.books || parsed;
              if (Array.isArray(importedBooks)) {
                await createSnapshot('Before JSON Import');
                await saveBooksBatch(importedBooks);
                alert(`Successfully imported ${importedBooks.length} books!`);
                navigateTo('library');
              }
            } catch (err) {
              alert('Invalid JSON file: ' + err.message);
            }
          };
          reader.readAsText(file);
        }
      });
    }

    // Import CSV
    const fileImportCsv = container.querySelector('#file-import-csv');
    if (fileImportCsv) {
      fileImportCsv.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const { headers, rows } = parseCSV(ev.target.result);
              // Default 1-to-1 mapping
              const mapping = {};
              headers.forEach(h => {
                const norm = h.toLowerCase();
                if (norm.includes('title')) mapping.title = h;
                else if (norm.includes('author')) mapping.authors = h;
                else if (norm.includes('isbn')) mapping.isbn = h;
                else if (norm.includes('publisher')) mapping.publisher = h;
                else if (norm.includes('year')) mapping.publicationYear = h;
                else if (norm.includes('category')) mapping.category = h;
                else if (norm.includes('room')) mapping.room = h;
                else if (norm.includes('cabinet')) mapping.cabinet = h;
                else if (norm.includes('shelf')) mapping.shelf = h;
              });

              if (!mapping.title) mapping.title = headers[0];

              const { books: parsedBooks, errors } = mapRowsToBooks(headers, rows, mapping);
              if (parsedBooks.length > 0) {
                await createSnapshot('Before CSV Import');
                await saveBooksBatch(parsedBooks);
                alert(`Successfully imported ${parsedBooks.length} books from CSV!`);
                navigateTo('library');
              } else {
                alert('No valid book rows found in CSV: ' + errors.join('\n'));
              }
            } catch (err) {
              alert('Failed to parse CSV: ' + err.message);
            }
          };
          reader.readAsText(file);
        }
      });
    }

    // Create Snapshot
    const btnCreateSnap = container.querySelector('#btn-create-snapshot');
    if (btnCreateSnap) {
      btnCreateSnap.addEventListener('click', async () => {
        const label = prompt('Snapshot Label:', 'Manual Checkpoint');
        if (label) {
          await createSnapshot(label);
          renderSettingsView(container, navigateTo, { tab: 'backups' });
        }
      });
    }

    // Restore Snapshot
    container.querySelectorAll('.btn-restore-snap').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm(t('restoreSnapshot') + '? Current unbacked-up changes will be overwritten.')) {
          await restoreSnapshot(btn.dataset.snapId);
          alert('Snapshot restored successfully!');
          navigateTo('library');
        }
      });
    });

    // Batch Cover Fetcher
    const btnBatchCovers = container.querySelector('#btn-batch-fetch-covers');
    if (btnBatchCovers) {
      btnBatchCovers.addEventListener('click', async () => {
        const missingCovers = books.filter(b => !b.deletedAt && !b.coverImage);
        if (missingCovers.length === 0) {
          alert('جميع الكتب في مكتبتك لديها أغلفة بالفعل!');
          return;
        }

        if (!confirm(`سيتم فحص ${missingCovers.length} كتاباً والبحث عن أغلفتها عبر الإنترنت وحفظها على جهازك. هل تريد البدء الآن؟`)) {
          return;
        }

        btnBatchCovers.disabled = true;
        const progressBox = container.querySelector('#batch-covers-progress-box');
        const statusBar = container.querySelector('#batch-covers-bar');
        const statusText = container.querySelector('#batch-covers-status');
        const statusPct = container.querySelector('#batch-covers-pct');

        if (progressBox) progressBox.style.display = 'block';

        let foundCount = 0;
        for (let i = 0; i < missingCovers.length; i++) {
          const b = missingCovers[i];
          const pct = Math.round(((i + 1) / missingCovers.length) * 100);
          if (statusBar) statusBar.style.width = `${pct}%`;
          if (statusPct) statusPct.textContent = `${pct}% (${i + 1}/${missingCovers.length})`;
          if (statusText) statusText.textContent = `جاري البحث: ${b.title}`;

          try {
            const author = (b.authors && b.authors.length > 0) ? b.authors[0] : '';
            const res = await searchBookCover(b.title, author, b.isbn);
            if (res && res.dataUrl) {
              b.coverImage = res.dataUrl;
              await saveBook(b);
              foundCount++;
            }
          } catch (e) {
            console.warn(`Cover fetch error for ${b.title}:`, e);
          }

          // Gentle throttle delay to respect API limits
          await new Promise(r => setTimeout(r, 250));
        }

        if (statusText) statusText.textContent = `اكتمل! تم العثور على ${foundCount} غلاف وحفظهم محلياً.`;
        alert(`✅ اكتملت العملية بنجاح!\nتم جلب وتخزين ${foundCount} غلاف جديد في قاعدة بياناتك المحلية.`);
        btnBatchCovers.disabled = false;
        renderSettingsView(container, navigateTo, { tab: 'backups' });
      });
    }

    // GitHub Sync Push
    const btnGhPush = container.querySelector('#btn-gh-push');
    if (btnGhPush) {
      btnGhPush.addEventListener('click', async () => {
        const repo = container.querySelector('#setting-gh-repo').value.trim();
        const token = container.querySelector('#setting-gh-token').value.trim();
        if (!repo || !token) {
          alert('Please enter both repository name and Personal Access Token.');
          return;
        }

        await setSetting('githubRepo', repo);
        await setSetting('githubToken', token);

        btnGhPush.disabled = true;
        btnGhPush.textContent = 'Pushing...';
        try {
          const currentBooks = await getAllBooks(true);
          const res = await pushToGitHub(token, repo, { books: currentBooks, exportedAt: new Date().toISOString() });
          await setSetting('githubLastSync', res.timestamp);
          alert('Successfully pushed library data to GitHub!');
          renderSettingsView(container, navigateTo, { tab: 'sync' });
        } catch (err) {
          alert('GitHub Push Error: ' + err.message);
          btnGhPush.disabled = false;
          btnGhPush.textContent = 'Push to GitHub';
        }
      });
    }

    // GitHub Sync Pull
    const btnGhPull = container.querySelector('#btn-gh-pull');
    if (btnGhPull) {
      btnGhPull.addEventListener('click', async () => {
        const repo = container.querySelector('#setting-gh-repo').value.trim();
        const token = container.querySelector('#setting-gh-token').value.trim();
        if (!repo || !token) {
          alert('Please enter both repository name and Personal Access Token.');
          return;
        }

        if (!confirm('Pulling from GitHub will merge/replace your local library with the cloud copy. Proceed?')) {
          return;
        }

        btnGhPull.disabled = true;
        btnGhPull.textContent = 'Pulling...';
        try {
          const { data } = await pullFromGitHub(token, repo);
          if (data && data.books) {
            await createSnapshot('Before GitHub Pull');
            await saveBooksBatch(data.books);
            await setSetting('githubLastSync', new Date().toISOString());
            alert(`Pulled ${data.books.length} books successfully from GitHub!`);
            navigateTo('library');
          }
        } catch (err) {
          alert('GitHub Pull Error: ' + err.message);
          btnGhPull.disabled = false;
          btnGhPull.textContent = 'Pull from GitHub';
        }
      });
    }

    // PIN Code
    const btnSavePin = container.querySelector('#btn-save-pin');
    if (btnSavePin) {
      btnSavePin.addEventListener('click', async () => {
        const pin = container.querySelector('#setting-pin-code').value.trim();
        await setSetting('pinCode', pin);
        alert('PIN setting saved.');
      });
    }

    // Clear Samples
    const btnClearSamples = container.querySelector('#btn-clear-samples');
    if (btnClearSamples) {
      btnClearSamples.addEventListener('click', async () => {
        if (confirm(t('clearSampleConfirm'))) {
          const count = await removeSampleBooks();
          alert(`Removed ${count} sample books.`);
          navigateTo('library');
        }
      });
    }

    // Wipe Database (Double confirmation)
    const btnWipe = container.querySelector('#btn-wipe-database');
    if (btnWipe) {
      btnWipe.addEventListener('click', async () => {
        if (confirm(t('wipeAllConfirm1'))) {
          const word = prompt(t('wipeAllConfirm2'));
          if (word === 'DELETE') {
            await wipeAllData();
            alert('All data has been wiped.');
            window.location.reload();
          } else {
            alert('Wipe cancelled: confirmation word was incorrect.');
          }
        }
      });
    }
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
