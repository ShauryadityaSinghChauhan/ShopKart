import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { removeFromWishlist, getErrorMessage } from '../services/wishlistService';
import { notifyWishlistChanged } from '../utils/wishlistEvents';
import { formatPrice, FALLBACK_IMAGE, handleImageError, getStockStatus } from '../utils/helpers';

// Wishlist cards need an explicit "Remove from Wishlist" action (unlike the
// catalogue card's toggle), so removal is its own button here.
const WishlistCard = ({ product, onRemoved }) => {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  const stock = getStockStatus(product.stock);

  const handleRemove = async () => {
    if (removing) return;

    setRemoving(true);
    setError('');

    try {
      const data = await removeFromWishlist(product._id);

      // The backend returns the new count, so the navbar updates without a refetch.
      notifyWishlistChanged(data.count);
      onRemoved?.(product._id);
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
      setError(getErrorMessage(err, 'Unable to remove product. Please try again.'));
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition duration-150">
      <img
        src={product.image || FALLBACK_IMAGE}
        alt={product.name}
        onError={handleImageError}
        className="h-48 w-full object-contain bg-slate-50 p-2"
      />

      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-base font-semibold text-slate-800 line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          {product.category}
        </p>
        <p className="mt-2 text-lg font-bold text-slate-900">
          {formatPrice(product.price)}
        </p>
        <p className={`mt-1 text-sm font-medium ${stock.className}`}>
          {stock.label}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            to={`/products/${product._id}`}
            className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            View Details
          </Link>

          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            aria-busy={removing}
            className="w-full py-2 px-4 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold rounded-md transition duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {removing ? '⏳ Removing...' : '♥ Remove from Wishlist'}
          </button>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistCard;
