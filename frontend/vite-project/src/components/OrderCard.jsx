import React from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, FALLBACK_IMAGE, handleImageError } from '../utils/helpers';
import { OrderStatusBadge, PaymentStatusBadge } from './OrderStatusBadge';

// Mongo ids are long and all look alike. The last eight characters are enough
// to tell two orders apart on screen, and the full id is still in the link.
const shortId = (id) => String(id || '').slice(-8).toUpperCase();

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// One row on the My Orders page.
const OrderCard = ({ order }) => {
  const unitCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Only the first few thumbnails fit; the rest become a "+N" tile so a large
  // order does not stretch the card.
  const previewItems = order.items.slice(0, 4);
  const remaining = order.items.length - previewItems.length;

  return (
    <article className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Order #{shortId(order._id)}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Placed on {formatDate(order.createdAt)} · {order.items.length}{' '}
            {order.items.length === 1 ? 'product' : 'products'}, {unitCount}{' '}
            {unitCount === 1 ? 'unit' : 'units'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge paymentStatus={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {previewItems.map((item, index) => (
            // The snapshot has no per-line _id (the subdocument schema sets
            // _id: false), and the same product cannot appear twice in one
            // order, so the product id is a stable key here.
            <img
              key={`${item.product}-${index}`}
              src={item.image || FALLBACK_IMAGE}
              alt={item.name}
              title={item.name}
              onError={handleImageError}
              className="h-12 w-12 object-contain bg-slate-50 border border-slate-200 rounded-md p-1"
            />
          ))}

          {remaining > 0 && (
            <span className="h-12 w-12 flex items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-xs font-semibold text-slate-600">
              +{remaining}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {formatPrice(order.totalAmount)}
          </span>

          <Link
            to={`/orders/${order._id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
};

export default OrderCard;
