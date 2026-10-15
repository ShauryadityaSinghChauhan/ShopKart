import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { getErrorMessage } from '../services/cartService';

// Shared by the catalogue card and the details page. The button owns only its
// own pending/error state; the cart itself lives in CartContext, so a success
// here updates the navbar badge and the cart page at the same time.
const AddToCartButton = ({ product, className = '', size = 'md' }) => {
  const { addToCart, quantityOf } = useCart();

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const inCart = quantityOf(product._id);
  const outOfStock = product.stock === 0;

  const handleClick = async () => {
    // Disabling alone is not enough: a fast double click can fire twice before
    // React re-renders, which would add two units from one press.
    if (adding) return;

    setAdding(true);
    setError('');

    try {
      await addToCart(product._id);
    } catch (err) {
      console.error('Add to cart failed:', err);
      setError(getErrorMessage(err, 'Unable to add to cart. Please try again.'));
    } finally {
      setAdding(false);
    }
  };

  // "Add Another" once a line exists, so the label tells the truth about what
  // pressing it does.
  const label = adding
    ? '⏳ Adding...'
    : inCart > 0
      ? 'Add Another'
      : 'Add to Cart';

  const padding = size === 'lg' ? 'py-3 px-6' : 'py-2 px-4';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={adding || outOfStock}
        aria-busy={adding}
        className={`w-full ${padding} bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition duration-150`}
      >
        {outOfStock ? 'Out of Stock' : label}
      </button>

      {inCart > 0 && !error && (
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          {inCart} in cart
        </p>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default AddToCartButton;
