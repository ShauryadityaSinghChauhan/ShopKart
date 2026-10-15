import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadge';
import { getOrderById, getErrorMessage } from '../services/orderService';
import { formatPrice, FALLBACK_IMAGE, handleImageError } from '../utils/helpers';

// The permanent record of one order.
//
// Every product name, price and image shown here is read from the order's own
// snapshot, not from the products collection. If the shop raises a price or
// deletes the product tomorrow, this page keeps showing exactly what was bought
// and what was paid.

const shortId = (id) => String(id || '').slice(-8).toUpperCase();

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const OrderDetails = () => {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const data = await getOrderById(id);
        if (ignore) return;
        setOrder(data);
        setStatus('ready');
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load order:', err);
        setError(getErrorMessage(err, 'We could not find that order.'));
        setStatus('error');
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  const handleRetry = () => {
    setStatus('loading');
    setError('');
    setReloadKey((key) => key + 1);
  };

  if (status === 'loading') {
    return <Loader message="Loading order details..." />;
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-lg font-semibold text-red-800">Order not available</p>
          {/* The endpoint answers 404 both for an order that does not exist and
              for one belonging to someone else, so this message is worded to
              cover both without confirming which. */}
          <p className="mt-2 text-red-700">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition duration-150"
            >
              Try Again
            </button>
            <Link
              to="/orders"
              className="px-5 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition duration-150"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unitCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/orders"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to My Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Order #{shortId(order._id)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Placed on {formatDateTime(order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge paymentStatus={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* --- Items --- */}
        <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <h3 className="text-lg font-bold text-slate-800">
            Items ({unitCount} {unitCount === 1 ? 'unit' : 'units'})
          </h3>

          <ul className="mt-4 divide-y divide-slate-100">
            {order.items.map((item, index) => (
              <li key={`${item.product}-${index}`} className="flex gap-4 py-4 first:pt-0">
                <img
                  src={item.image || FALLBACK_IMAGE}
                  alt={item.name}
                  onError={handleImageError}
                  className="h-20 w-20 shrink-0 object-contain bg-slate-50 border border-slate-200 rounded-md p-1"
                />

                <div className="flex flex-1 min-w-0 flex-col">
                  {/* The name comes from the snapshot, so a renamed product
                      still reads as what was bought. The link uses the stored
                      reference and only appears while the product exists. */}
                  {item.product ? (
                    <Link
                      to={`/products/${item.product}`}
                      className="text-sm font-semibold text-slate-800 hover:text-blue-700 line-clamp-2"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-slate-800 line-clamp-2">
                      {item.name}
                    </span>
                  )}

                  <span className="mt-1 text-xs text-slate-500">
                    {formatPrice(item.price)} × {item.quantity}
                  </span>
                </div>

                <span className="text-sm font-semibold text-slate-800 tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2 pt-4 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-base font-semibold text-slate-800">Total Paid</span>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {/* --- Shipping --- */}
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-800">Shipping Address</h3>
            <address className="mt-3 not-italic text-sm text-slate-600 leading-relaxed">
              <span className="block font-semibold text-slate-800">
                {order.shippingAddress.fullName}
              </span>
              <span className="block">{order.shippingAddress.addressLine1}</span>
              <span className="block">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.pincode}
              </span>
              <span className="mt-1 block">Phone: {order.shippingAddress.phone}</span>
            </address>
          </section>

          {/* --- Payment --- */}
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-800">Payment</h3>

            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Status</dt>
                <dd className="font-medium text-slate-800">{order.paymentStatus}</dd>
              </div>

              {order.razorpayOrderId && (
                <div>
                  <dt className="text-slate-600">Razorpay Order ID</dt>
                  <dd className="mt-0.5 font-medium text-slate-800 break-all">
                    {order.razorpayOrderId}
                  </dd>
                </div>
              )}

              {order.razorpayPaymentId && (
                <div>
                  <dt className="text-slate-600">Razorpay Payment ID</dt>
                  <dd className="mt-0.5 font-medium text-slate-800 break-all">
                    {order.razorpayPaymentId}
                  </dd>
                </div>
              )}

              {!order.razorpayPaymentId && (
                <p className="text-xs text-slate-500">
                  No payment has been recorded against this order.
                </p>
              )}
            </dl>

            {/* ShopKart stores Razorpay's identifiers only. The card number,
                CVV and UPI PIN were entered on Razorpay's own page and were
                never sent here, so there is nothing else to show. */}
            <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Card details are collected by Razorpay and are never stored by
              ShopKart.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
