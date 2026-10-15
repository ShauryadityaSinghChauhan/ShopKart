import React, { useEffect, useState } from 'react';
import { toggleWishlist, getErrorMessage } from '../services/wishlistService';
import { notifyWishlistChanged } from '../utils/wishlistEvents';

// One button shared by the catalogue card, the details page and anywhere else
// a product appears, so the four interaction states live in a single place.
//
// `saved` is the parent's view of the truth (seeded from the API); the button
// keeps its own copy so it can flip instantly, then reports the change back
// through `onChange` so the parent can stay in sync.
const WishlistButton = ({ productId, saved = false, onChange, className = '' }) => {
  const [isSaved, setIsSaved] = useState(Boolean(saved));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // A refetch in the parent can change the real state, so mirror it.
  useEffect(() => {
    setIsSaved(Boolean(saved));
  }, [saved]);

  const handleClick = async () => {
    // Guard rather than disable alone: a double click can fire twice before
    // React re-renders, and the second call must not reach the API.
    if (saving) return;

    setSaving(true);
    setError('');

    try {
      const data = await toggleWishlist(productId);

      setIsSaved(data.saved);
      onChange?.(data.saved);
      notifyWishlistChanged(data.count);
    } catch (err) {
      console.error('Wishlist toggle failed:', err);
      setError(
        getErrorMessage(
          err,
          isSaved
            ? 'Unable to remove product. Please try again.'
            : 'Unable to save product. Please try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const label = saving
    ? isSaved
      ? '⏳ Removing...'
      : '⏳ Saving...'
    : isSaved
      ? '♥ Remove from Wishlist'
      : '♡ Add to Wishlist';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        aria-pressed={isSaved}
        aria-busy={saving}
        className={`w-full py-2 px-4 text-sm font-semibold rounded-md border transition duration-150 disabled:cursor-not-allowed ${
          isSaved
            ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 disabled:opacity-70'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-70'
        }`}
      >
        {label}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default WishlistButton;
