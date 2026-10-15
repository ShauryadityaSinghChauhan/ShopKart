import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getErrorMessage } from '../services/cartService';
import { formatPrice, FALLBACK_IMAGE, handleImageError } from '../utils/helpers';

// One cart line. Quantity changes and removal both go through the context, so
// the navbar badge and the order summary move with them.
const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const { product, quantity } = item;
  const lineTotal = product.price * quantity;

  // Both bounds come from the product's current stock, which the server sends
  // with every cart response, so the controls cannot request an impossible
  // quantity in the first place.
  const atMin = quantity <= 1;
  const atMax = quantity >= product.stock;

  const run = async (action) => {
    if (pending) return;

    setPending(true);
    setError('');

    try {
      await action();
    } catch (err) {
      console.error('Cart update failed:', err);
      setError(getErrorMessage(err, 'Unable to update your cart. Please try again.'));
    } finally {
      setPending(false);
    }
  };

  const changeQuantity = (next) =>
    run(() => updateQuantity(product._id, next));

  const handleRemove = () => run(() => removeFromCart(product._id));

  const stepClass =
    'h-9 w-9 flex items-center justify-center border border-slate-300 rounded-md bg-white text-slate-700 font-bold text-lg leading-none hover:bg-slate-50 transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <img
          src={product.image || FALLBACK_IMAGE}
          alt={product.name}
          onError={handleImageError}
          className="h-24 w-24 shrink-0 object-contain bg-slate-50 rounded-md p-1"
        />

        <div className="flex flex-1 flex-col min-w-0">
          <Link
            to={`/products/${product._id}`}
            className="text-base font-semibold text-slate-800 hover:text-blue-700 line-clamp-2"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            {product.category}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatPrice(product.price)} each
          </p>
          <p className={`mt-0.5 text-xs font-medium ${atMax ? 'text-amber-600' : 'text-slate-500'}`}>
            {product.stock === 0
              ? 'Out of stock'
              : atMax
                ? `Maximum available (${product.stock})`
                : `${product.stock} available`}
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
          <p className="text-lg font-bold text-slate-900 tabular-nums">
            {formatPrice(lineTotal)}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={pending || atMin}
              aria-label={`Decrease quantity of ${product.name}`}
              title={atMin ? 'Use Remove to delete this item' : 'Decrease'}
              className={stepClass}
            >
              −
            </button>

            <span
              aria-live="polite"
              className="w-10 text-center text-sm font-semibold text-slate-800 tabular-nums"
            >
              {pending ? '…' : quantity}
            </span>

            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={pending || atMax}
              aria-label={`Increase quantity of ${product.name}`}
              title={atMax ? `Only ${product.stock} in stock` : 'Increase'}
              className={stepClass}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="text-sm font-semibold text-rose-700 hover:text-rose-800 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default CartItem;
