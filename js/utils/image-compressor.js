/**
 * image-compressor.js - Compresses and resizes cover images to max ~400px wide WebP/JPEG
 * before storing in IndexedDB to keep storage ultra-lightweight and fast.
 */

export async function compressImageFile(file, maxWidth = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid image file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const resultDataUrl = resizeAndCompressImage(img, maxWidth, quality);
          resolve(resultDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function resizeAndCompressImage(img, maxWidth = 400, quality = 0.82) {
  const canvas = document.createElement('canvas');
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Try WebP first, fallback to JPEG
  try {
    const webpUrl = canvas.toDataURL('image/webp', quality);
    if (webpUrl && webpUrl.startsWith('data:image/webp')) {
      return webpUrl;
    }
  } catch (e) {
    // fallback
  }

  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImageUrl(url, maxWidth = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const result = resizeAndCompressImage(img, maxWidth, quality);
        resolve(result);
      } catch (err) {
        // If canvas is tainted due to CORS, return original url
        resolve(url);
      }
    };
    img.onerror = () => resolve(url); // fallback
    img.src = url;
  });
}

export async function compressImage(file, options = {}) {
  const maxWidth = options.maxWidth || 400;
  const quality = options.quality || 0.82;
  return compressImageFile(file, maxWidth, quality);
}
