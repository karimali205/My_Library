/**
 * themes.js - Theme engine, fonts, shelf density, and appearance
 */

export const THEMES = [
  { id: 'classic-wood', nameEn: 'Classic Wood', nameAr: 'الخشب الكلاسيكي' },
  { id: 'crimson-pearl', nameEn: 'Crimson & Pearl (Red & White)', nameAr: 'الأحمر واللؤلؤي (الهوية الخاصة)' },
  { id: 'dark-academia', nameEn: 'Dark Academia', nameAr: 'الأكاديميا الداكنة' },
  { id: 'modern-minimal', nameEn: 'Modern Minimal', nameAr: 'المعاصر البسيط' },
  { id: 'midnight', nameEn: 'Midnight Reading', nameAr: 'قراءة منتصف الليل' },
  { id: 'sepia-paper', nameEn: 'Sepia Paper', nameAr: 'ورق السيبيا العتيق' }
];

export const DENSITIES = ['compact', 'comfortable', 'spacious'];

const defaultThemeState = {
  theme: 'classic-wood',
  mode: 'dark', // 'light' | 'dark' | 'auto'
  density: 'comfortable',
  shelfStyle: 'wood', // 'wood' | 'minimal' | 'glass'
  arabicFont: 'Cairo', // 'Cairo' | 'Amiri' | 'Tajawal' | 'Noto Naskh Arabic'
  englishFont: 'Playfair Display', // 'Playfair Display' | 'Lora' | 'Inter'
  fontSize: 'medium', // 'small' | 'medium' | 'large'
  animations: true,
  customAccent: '#c59b27'
};

let currentThemeState = { ...defaultThemeState };

export function initTheme() {
  try {
    const saved = localStorage.getItem('mylibrary_theme_settings');
    if (saved) {
      currentThemeState = { ...defaultThemeState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to parse theme settings', e);
  }

  applyTheme(currentThemeState);

  // Listen for system color-scheme changes if auto mode
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentThemeState.mode === 'auto') {
        applyTheme(currentThemeState);
      }
    });
  }
}

export function getThemeState() {
  return { ...currentThemeState };
}

export function updateThemeState(partial) {
  currentThemeState = { ...currentThemeState, ...partial };
  localStorage.setItem('mylibrary_theme_settings', JSON.stringify(currentThemeState));
  applyTheme(currentThemeState);
}

export function applyTheme(state) {
  const root = document.documentElement;
  
  // 1. Theme name data attribute
  root.setAttribute('data-theme', state.theme);

  // 2. Mode (Light / Dark / Auto)
  let effectiveMode = state.mode;
  if (effectiveMode === 'auto') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveMode = prefersDark ? 'dark' : 'light';
  }
  root.setAttribute('data-mode', effectiveMode);

  // 3. Density & Shelf style
  root.setAttribute('data-density', state.density);
  root.setAttribute('data-shelf-style', state.shelfStyle);

  // 4. Font size
  root.setAttribute('data-font-size', state.fontSize);

  // 5. Custom Accent override
  if (state.customAccent) {
    root.style.setProperty('--accent-gold', state.customAccent);
    root.style.setProperty('--accent-glow', `${state.customAccent}40`);
  }

  // 6. Font families
  if (state.arabicFont) {
    root.style.setProperty('--font-title-ar', `'${state.arabicFont}', serif, sans-serif`);
  }
  if (state.englishFont) {
    root.style.setProperty('--font-title-en', `'${state.englishFont}', serif, Georgia`);
  }

  // 7. Animations toggle
  if (state.animations === false) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
}
