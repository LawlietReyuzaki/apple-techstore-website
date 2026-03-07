/**
 * Resolves a stored image path to a safe renderable URL.
 * After GCS migration, DB paths are full https://storage.googleapis.com/... URLs.
 * Local relative paths (images/foo.jpg) still work for dev via Express/Vite.
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path || path.trim() === '') return '/placeholder.svg';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `/${path}`;
}

/**
 * Maps an entire images array through getImageUrl.
 * Falls back to ['/placeholder.svg'] if array is empty or null.
 */
export function getImageUrls(images: string[] | null | undefined): string[] {
  if (!images || images.length === 0) return ['/placeholder.svg'];
  return images.map(getImageUrl);
}

const SITE_ORIGIN = 'https://appletechstore.pk';

/**
 * Returns a fully-qualified absolute URL suitable for og:image / twitter:image.
 * Relative paths get the site origin prepended.
 */
export function getAbsoluteImageUrl(path: string | null | undefined): string {
  if (!path || path.trim() === '') return `${SITE_ORIGIN}/favicon.png`;
  if (path.startsWith('http')) return path;
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${withSlash}`;
}
