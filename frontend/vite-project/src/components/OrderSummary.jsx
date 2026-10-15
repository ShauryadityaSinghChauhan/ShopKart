import React from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, FALLBACK_IMAGE, handleImageError } from '../utils/helpers';

// The list of lines about to be bought.
//
// It reads from the cart context, which mirrors the server's cart, so the
// prices shown here are the ones the server will use to build the order
// snapshot. The final figure is still the server's - this is a preview, not
// the source of truth for what gets charged.
const OrderSummary = ({ items, subtotal, totalItems }) => {
  return (
    <aside className="lg:sticky lg:top-6 bg-white border border-slate-200 rounded-lg shadow-sm p-5">
      <h3 className="text-lg font-bold text-slate-800">Order Summary</h3>

      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.product._id} className="flex gap-3 py-3 first:pt-0">
            <img
              src={item.product.image || FALLBACK_IMAGE}
              alt={item.product.name}
              onError={handleImageError}
              className="h-14 w-14 shrink-0 object-contain bg-slate-50 rounded-md p-1"
            />

            <div className="flex flex-1 min-w-0 flex-col">
              <Link
                to={`/products/${item.product._id}`}
                className="text-sm font-medium text-slate-800 hover:text-blue-700 line-clamp-2"
              >
                {item.product.name}
              </Link>
              <span className="mt-0.5 text-xs text-slate-500">
                {item.quantity} × {formatPrice(item.product.price)}
              </span>
            </div>

            <span className="text-sm font-semibold text-slate-800 tabular-nums">
              {formatPrice(item.product.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">
            Items ({totalItems} {totalItems === 1 ? 'unit' : 'units'})
          </dt>
          <dd className="font-medium text-slate-800 tabular-nums">
            {formatPrice(subtotal)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Shipping</dt>
          <dd className="font-medium text-slate-800">Free</dd>
        </div>
      </dl>

      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-baseline">
        <span className="text-base font-semibold text-slate-800">Total</span>
        <span className="text-2xl font-bold text-slate-900 tabular-nums">
          {formatPrice(subtotal)}
        </span>
      </div>
    </aside>
  );
};

export default OrderSummary;
