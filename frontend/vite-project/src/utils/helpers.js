// Placeholder shown when a product image fails to load
export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
      '<rect width="100%" height="100%" fill="#e2e8f0"/>' +
      '<text x="50%" y="50%" font-family="sans-serif" font-size="18" fill="#94a3b8" ' +
      'text-anchor="middle" dominant-baseline="middle">No image available</text>' +
    '</svg>'
  );

// 4999 -> "₹4,999"
export const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

// Swaps in the placeholder once, so a broken URL can't loop on error
export const handleImageError = (event) => {
  if (event.currentTarget.src !== FALLBACK_IMAGE) {
    event.currentTarget.src = FALLBACK_IMAGE;
  }
};

// Pulls a readable message out of an axios error (the backend sends `message`).
// Shared by every service so API failures are surfaced the same way everywhere.
export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

// Shared by the product grid and the wishlist grid so stock reads identically.
export const getStockStatus = (stock) => {
  if (stock === 0) return { label: 'Out of stock', className: 'text-red-600' };
  if (stock <= 5) return { label: `Only ${stock} left`, className: 'text-amber-600' };
  return { label: `${stock} units left`, className: 'text-green-600' };
};
