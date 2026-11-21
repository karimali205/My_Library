/**
 * app.js - Central Application Controller, Router & State Coordinator
 * Handles routing, layout shells, bilingual reactivity, desktop keyboard shortcuts,
 * optional PIN security lock, and offline Service Worker updates.
 */

import { initI18n, t, getLanguage, setLanguage, isRTL, subscribeLanguage } from './i18n.js';
import { initTheme, getThemeState, updateThemeState } from './themes.js';
import { seedSampleBooksIfEmpty, autoPurgeTrash, getSetting, getAllBooks } from './db.js';

// Import View Modules
import { renderHomeView } from './views/home.js';
import { renderLibraryView } from './views/library.js';
import { renderBookDetailsView } from './views/book-details.js';
import { renderBookFormView } from './views/book-form.js';
import { renderSmartAddView } from './views/smart-add.js';
import { renderAuthorsView } from './views/authors.js';
import { renderSeriesView } from './views/series.js';
import { renderCollectionsView } from './views/collections.js';
import { renderLoansView } from './views/loans.js';
import { renderWishlistView } from './views/wishlist.js';
import { renderMapView } from './views/map.js';
import { renderStatsView } from './views/stats.js';
import { renderInventoryView } from './views/inventory.js';
import { renderSettingsView } from './views/settings.js';

let currentRoute = 'home';
let routeParams = {};
let isAppUnlocked = false;

// ---------------- ROUTER ---------------- //

export async function navigateTo(route, params = {}) {
  currentRoute = route;
  routeParams = params;
  window.location.hash = `#/${route}`;
  
  updateNavigationUI(route);
  renderCurrentView();
}

async function renderCurrentView() {
  const mount = document.getElementById('view-mount');
  if (!mount) return;

  // Scroll to top on navigation
  window.scrollTo(0, 0);

  switch (currentRoute) {
    case 'home':
      await renderHomeView(mount, navigateTo);
      break;
    case 'library':
      await renderLibraryView(mount, navigateTo, routeParams);
      break;
    case 'book-details':
      await renderBookDetailsView(mount, navigateTo, routeParams);
      break;
    case 'book-form':
      await renderBookFormView(mount, navigateTo, routeParams);
      break;
    case 'smart-add':
      await renderSmartAddView(mount, navigateTo);
      break;
    case 'authors':
      await renderAuthorsView(mount, navigateTo);
      break;
    case 'series':
      await renderSeriesView(mount, navigateTo);
      break;
    case 'collections':
      await renderCollectionsView(mount, navigateTo);
      break;
    case 'loans':
      await renderLoansView(mount, navigateTo);
      break;
    case 'wishlist':
      await renderWishlistView(mount, navigateTo);
      break;
    case 'map':
      await renderMapView(mount, navigateTo);
      break;
    case 'stats':
      await renderStatsView(mount, navigateTo);
      break;
    case 'inventory':
      await renderInventoryView(mount, navigateTo);
      break;
    case 'settings':
      await renderSettingsView(mount, navigateTo, routeParams);
      break;
    default:
      await renderHomeView(mount, navigateTo);
      break;
  }
}

// ---------------- NAVIGATION UI (SIDEBAR & BOTTOM NAV) ---------------- //

function updateNavigationUI(route) {
  // Update desktop sidebar
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    if (link.dataset.route === route) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update mobile bottom nav
  document.querySelectorAll('#bottom-nav .bottom-nav-item').forEach(item => {
    if (item.dataset.route === route) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function renderShellStrings() {
  const isAr = getLanguage() === 'ar';
  
  // Header language button
  const langBtn = document.getElementById('btn-header-lang');
  if (langBtn) {
    langBtn.textContent = isAr ? 'English' : 'العربية';
    langBtn.title = isAr ? 'Switch to English' : 'التحويل للعربية';
  }

  // App titles
  const brandTitle = document.querySelector('.app-brand-title');
  if (brandTitle) brandTitle.textContent = t('appName');
  const brandSubtitle = document.querySelector('.app-brand-subtitle');
  if (brandSubtitle) brandSubtitle.textContent = t('appSubtitle');

  const mobileTitle = document.querySelector('.mobile-brand-title');
  if (mobileTitle) mobileTitle.textContent = t('appName');

  // Sidebar links
  const navMap = [
    { route: 'home', label: t('navHome') },
    { route: 'library', label: t('navLibrary') },
    { route: 'smart-add', label: t('navSmartAdd') },
    { route: 'loans', label: t('navLoans') },
    { route: 'authors', label: t('navAuthors') },
    { route: 'series', label: t('navSeries') },
    { route: 'collections', label: t('navCollections') },
    { route: 'wishlist', label: t('navWishlist') },
    { route: 'map', label: t('navMap') },
    { route: 'stats', label: t('navStats') },
    { route: 'inventory', label: t('navInventory') },
    { route: 'settings', label: t('navSettings') }
  ];

  navMap.forEach(item => {
    const link = document.querySelector(`.sidebar-nav .nav-link[data-route="${item.route}"] .nav-link-text`);
    if (link) link.textContent = item.label;

    const bLink = document.querySelector(`#bottom-nav .bottom-nav-item[data-route="${item.route}"] .bottom-nav-label`);
    if (bLink) bLink.textContent = item.label;
  });
}

// ---------------- PIN SECURITY LOCK ---------------- //

async function checkPinLock() {
  const pin = await getSetting('pinCode', '');
  if (!pin || isAppUnlocked) return true;

  const userEntered = prompt(t('enterPinToUnlock'));
  if (userEntered === pin) {
    isAppUnlocked = true;
    return true;
  } else {
    alert(t('pinIncorrect'));
    return checkPinLock();
  }
}

// ---------------- PWA STANDALONE & INSTALL MANAGEMENT ---------------- //
let deferredInstallPrompt = null;

function initStandaloneDetection() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true ||
                       document.referrer.includes('android-app://');

  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
    hideInstallTriggers();
  }

  // Monitor display-mode changes (e.g. user installs or launches as PWA)
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('is-standalone');
      hideInstallTriggers();
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppress if already running in standalone mode
    if (document.documentElement.classList.contains('is-standalone')) {
      e.preventDefault();
      return false;
    }
    // Prevent default mini-infobar from appearing automatically
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.documentElement.classList.add('is-standalone');
    hideInstallTriggers();
    console.log('App installed as standalone PWA');
  });
}

function hideInstallTriggers() {
  document.querySelectorAll('.pwa-install-trigger').forEach(el => {
    el.style.display = 'none';
  });
}

// ---------------- SERVICE WORKER ---------------- //

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then((registration) => {
        // Check for updates on every page load
        registration.update().catch(() => {});

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(err => {
        console.warn('SW registration skipped or failed:', err);
      });
    });
  }
}

function showUpdateToast(worker) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>🚀 New version available!</span>
    <button class="btn btn-sm btn-brass" id="btn-sw-reload" style="padding: 2px 8px; margin-inline-start: 8px;">Update</button>
  `;
  toast.querySelector('#btn-sw-reload').addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
  toastContainer.appendChild(toast);
}

// ---------------- KEYBOARD SHORTCUTS ---------------- //

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // If typing in input or textarea, ignore shortcuts
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === '/' || e.key === '؟') {
      e.preventDefault();
      navigateTo('library');
      setTimeout(() => {
        const searchInput = document.getElementById('lib-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    } else if (e.key.toLowerCase() === 'n' || e.key === 'ى') {
      e.preventDefault();
      navigateTo('book-form');
    }
  });
}

// ---------------- APP BOOTSTRAP ---------------- //

async function initApp() {
  // 1. Initialize i18n
  initI18n();

  // 2. Initialize Theme
  initTheme();

  // 2.1 Initialize Standalone PWA detection
  initStandaloneDetection();

  // 3. Seed initial 20 sample books if empty database & purge old trash
  await seedSampleBooksIfEmpty();
  await autoPurgeTrash();

  // 4. Check PIN lock if configured
  await checkPinLock();

  // 5. Render strings in layout
  renderShellStrings();
  subscribeLanguage(() => {
    renderShellStrings();
    renderCurrentView();
  });

  // 6. Setup header buttons
  const langToggleBtn = document.getElementById('btn-header-lang');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const next = getLanguage() === 'ar' ? 'en' : 'ar';
      setLanguage(next);
    });
  }

  const themeToggleBtn = document.getElementById('btn-header-theme');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = getThemeState().mode;
      const next = current === 'dark' ? 'light' : 'dark';
      updateThemeState({ mode: next });
    });
  }

  const newBookHeaderBtn = document.getElementById('btn-header-new-book');
  if (newBookHeaderBtn) {
    newBookHeaderBtn.addEventListener('click', () => navigateTo('book-form'));
  }

  // 7. Navigation clicks & Mobile Sidebar Drawer
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebarCloseBtn = document.getElementById('btn-sidebar-close');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileSidebar);
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  document.querySelectorAll('.sidebar-nav .nav-link, #bottom-nav .bottom-nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.dataset.route;
      closeMobileSidebar();
      if (route) navigateTo(route);
    });
  });

  // 8. Hash change listener for back/forward browser buttons
  window.addEventListener('hashchange', () => {
    const raw = window.location.hash.replace(/^#\//, '');
    if (raw && raw !== currentRoute) {
      navigateTo(raw);
    }
  });

  // 9. Initial Route from hash or default 'home'
  const initialHash = window.location.hash.replace(/^#\//, '');
  const initialRoute = initialHash || 'home';
  navigateTo(initialRoute);

  // 10. Register Service Worker & Keyboard shortcuts
  registerServiceWorker();
  setupKeyboardShortcuts();
}

// Kick off when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
