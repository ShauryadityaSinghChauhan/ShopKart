import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/OrderStatusBadge';
import { getOrderById, getErrorMessage } from '../services/orderService';
import { formatPrice } from '../utils/helpers';

// The confirmation screen.
//
// Checkout navigates here with the verified order already in location.state, so
// the usual case paints instantly with no second request. The fetch underneath
// only runs when that state is missing - a refresh, or a link opened directly -
// and the endpoint still enforces ownership, so an id typed by hand returns
// nothing it should not.

const shortId = (id) => String(id || '').slice(-8).toUpperCase();

const OrderSuccess = () => {
  const { id } = useParams();
  const location = useLocation();

  const passedOrder = location.state?.order ?? null;

  const [order, setOrder] = useState(passedOrder);
  const [status, setStatus] = useState(passedOrder ? 'ready' : 'loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (passedOrder) return;

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
  }, [id, passedOrder]);

  if (status === 'loading') {
    return <Loader message="Loading your order..." />;
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-lg font-semibold text-red-800">Order not available</p>
          <p className="mt-2 text-red-700">{error}</p>
          <Link
            to="/orders"
            className="inline-block mt-6 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
          <span className="text-3xl" aria-hidden="true">✓</span>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-slate-800">Payment successful</h2>
        <p className="mt-2 text-slate-600">
          Thank you, {order.shippingAddress.fullName.split(' ')[0]}. Your order
          has been placed.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge paymentStatus={order.paymentStatus} />
        </div>

        <dl className="mt-6 text-left divide-y divide-slate-100 border-y border-slate-100">
          <div className="flex justify-between py-3">
            <dt className="text-sm text-slate-600">Order ID</dt>
            <dd className="text-sm font-semibold text-slate-800">
              #{shortId(order._id)}
            </dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-sm text-slate-600">Amount paid</dt>
            <dd className="text-sm font-semibold text-slate-800 tabular-nums">
              {formatPrice(order.totalAmount)}
            </dd>
          </div>
          {order.razorpayPaymentId && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-slate-600">Payment ID</dt>
              <dd className="text-sm font-medium text-slate-800 break-all text-right">
                {order.razorpayPaymentId}
              </dd>
            </div>
          )}
          <div className="flex justify-between py-3">
            <dt className="text-sm text-slate-600">Delivering to</dt>
            <dd className="text-sm font-medium text-slate-800 text-right">
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.pincode}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            to={`/orders/${order._id}`}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            View Order Details
          </Link>
          <Link
            to="/products"
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-md transition duration-150"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
