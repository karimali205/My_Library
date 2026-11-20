# My Library - مكتبتي 📚🏛️

> A warm, cozy personal library catalog web app for physical book lovers. Featuring realistic wooden bookshelves, dynamic book spine generation, barcode scanner, full bilingual Arabic (RTL) & English (LTR) instant switching, and offline PWA support.

---

## ✨ Features Overview

- **Aesthetic Wooden Bookshelf**: Books standing on wooden shelves with realistic wood textures, gold foil stamping, bookmarks, and a smooth lifting animation upon interaction.
- **Dynamic Spine & Cover Generator**: Generates custom leather/paper spines and vintage filigree covers for books without cover images, supporting Arabic and English titles with authentic typography.
- **Instant Bilingual Switching (RTL / LTR)**: Instant switch between Arabic (RTL) and English (LTR) without reloading the page. All layout properties use CSS logical properties (`margin-inline-start`, etc.).
- **Smart Adding & Barcode Scanner**: Scan physical ISBN barcodes via mobile camera (native `BarcodeDetector` API) and auto-fetch book metadata, author, publisher, page count, and cover from Open Library & Google Books. Includes a Continuous Scan mode for fast batch processing.
- **"Do I Own This?" Retail Check**: Quickly search or scan in bookstores to verify if a copy is already present in your home library.
- **Rich Book Data Model**: Multi-author support, translators, publishers, edition, ISBN, page count, reading status & progress tracking, 1-5 star ratings, treasured quotes on vintage parchment, purchase prices & currencies, series & missing volume detection, and custom collections.
- **Lending & Loan Tracking**: Track borrowed books, overdue dates with alerts, borrower contacts, and archive historical loans.
- **Visual Library Blueprint Map**: Architectural hierarchy (Room > Cabinet > Shelf Level). Tap any shelf to immediately view books resting on it.
- **Physical Shelf Inventory Audit**: Verify physical books on your shelves and generate reconciliation reports of missing or misplaced volumes.
- **Data Safety & Rollback**:
  - Primary storage in IndexedDB (autosaved on every change).
  - Storage persistence request via `navigator.storage.persist()`.
  - Automatic 5 internal snapshots for one-click rollback.
  - 30-day Recycle Bin (Trash) with restore capability.
  - Full single-file JSON backup (including images) and CSV/Excel export & import.
  - Private GitHub Repository Sync via personal access token (PAT).
- **5 Visual Themes (Light & Dark)**:
  1. *Classic Wood* (Warm browns, cream paper, brass accents)
  2. *Dark Academia* (Deep burgundy, forest green, aged gold)
  3. *Modern Minimal* (White/slate grey, clean lines)
  4. *Midnight Reading* (Dark navy, warm lamp-glow accents)
  5. *Sepia Paper* (Vintage parchment, ink-like text)

---

## 🚀 Local Run Instructions

Because the application is built using standard Vanilla JavaScript ES Modules (`import`/`export`), it needs to be served over HTTP (browsers block ES modules over direct `file://` protocol due to CORS security rules).

### Option 1: Python (Built-in)
Run the following in the repository folder:
```bash
# Python 3
python -m http.server 8000
```
Then open: `http://localhost:8000`

### Option 2: Node.js (npx)
```bash
npx serve .
```

### Option 3: VS Code / IDE
Install the **Live Server** extension, right click `index.html`, and select **Open with Live Server**.

---

## 🌐 Step-by-Step GitHub Pages Deployment

The app is crafted with strictly relative URLs (`./css/...`, `./js/...`, `./manifest.webmanifest`), which ensures 100% compatibility with GitHub Pages subpath repositories (e.g., `https://username.github.io/my-library/`).

1. Create a repository on GitHub (e.g. `my-library`).
2. Push this project code to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: My Library PWA"
   git branch -M main
   git remote add origin https://github.com/<your-username>/my-library.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Click **Settings** (tab at the top).
   - In the left sidebar, click **Pages**.
   - Under **Build and deployment > Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
4. Within 1-2 minutes, GitHub Pages will deploy your site at:
   `https://<your-username>.github.io/my-library/`

---

## 📱 Installing the PWA on Phone or Tablet

This application satisfies all Progressive Web App (PWA) requirements:
- Web App Manifest (`manifest.webmanifest`)
- Service Worker caching (`service-worker.js`)
- Maskable SVG icon (`icons/icon.svg`)
- Offline operation support

### On Android (Chrome / Brave / Edge)
1. Open your deployed URL (or local server) in Chrome.
2. Tap the three-dot menu (**⋮**) in the top right corner.
3. Tap **Install app** or **Add to Home screen**.
4. The app will install as a standalone native-feeling application with no browser URL bar.

### On iOS (Safari)
1. Open the URL in Safari.
2. Tap the **Share** button (box with an upward arrow at the bottom).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

---

## ☁️ Setting Up GitHub Private Sync

You can synchronize your library database to a private repository on GitHub to have cloud backup without relying on any third-party servers.

### 1. Create a Private GitHub Repository
1. Go to GitHub and click **New Repository**.
2. Name it (e.g. `my-library-data`).
3. **IMPORTANT**: Mark it as **Private** so your personal library notes, quotes, and reading progress remain private.
4. Click **Create repository**.

### 2. Generate a Minimal-Permission Personal Access Token (PAT)
1. On GitHub, click your profile picture in the top right > **Settings**.
2. Scroll to the bottom of the left sidebar and click **Developer settings**.
3. Select **Personal access tokens** > **Fine-grained tokens** (or Tokens classic).
4. Click **Generate new token**.
5. Token settings:
   - **Token name**: `MyLibrary Sync`
   - **Expiration**: 90 days or 1 year.
   - **Repository access**: Select **Only select repositories** > choose your `my-library-data` repository.
   - **Permissions**: Under **Repository permissions**, find **Contents** and set it to **Read and write**.
6. Click **Generate token** and copy the resulting string (starts with `github_pat_` or `ghp_`).

### 3. Configure in My Library
1. In the app, navigate to **Settings (الإعدادات)** > **GitHub Sync (المزامنة مع مستودع GitHub خاص)**.
2. In **Repository Name**, type `your-username/my-library-data`.
3. In **Personal Access Token**, paste your token.
4. Click **Push to GitHub** to back up your current library, or **Pull from GitHub** when syncing on a new device.
*(Note: Your token is stored strictly in your local device's IndexedDB and is never transmitted to any third party).*

---

## ⌨️ Desktop Keyboard Shortcuts

- `/` or `؟` : Immediately jump to search input in the Library catalog.
- `N` or `ى` : Quick open New Book form.
- `Esc` : Close open modals.

---

## 📄 License
MIT License. Crafted with love for bibliophiles and book lovers worldwide.
