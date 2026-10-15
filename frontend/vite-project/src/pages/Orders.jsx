import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import Loader from '../components/Loader';
import { getOrders, getErrorMessage } from '../services/orderService';

// My Orders.
//
// GET /orders takes no user id - the server reads the token and returns that
// account's orders. There is deliberately no query parameter for a user here,
// so this page has no way to ask for anybody else's history.

const Orders = () => {
  const [orders, setOrders] = useState([]);

  // One value instead of a loading boolean and an error string that could
  // contradict each other. There are exactly three things this page can be
  // doing, so there are exactly three states.
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  // Bumped by Try Again to re-run the fetch. Using a counter rather than
  // calling the loader directly keeps the request inside the effect, where it
  // is cancelled properly if the page unmounts.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const data = await getOrders();
        // A response that arrives after the page is gone would set state on an
        // unmounted component.
        if (ignore) return;
        setOrders(data);
        setStatus('ready');
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load orders:', err);
        setError(getErrorMessage(err, "We couldn't load your orders."));
        setStatus('error');
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // State is reset here, in the click handler, rather than at the top of the
  // effect - a synchronous setState inside an effect would cause an extra
  // render pass before the request has even started.
  const handleRetry = () => {
    setStatus('loading');
    setError('');
    setReloadKey((key) => key + 1);
  };

  if (status === 'loading') {
    return <Loader message="Loading your orders..." />;
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-lg font-semibold text-red-800">Something went wrong.</p>
          <p className="mt-2 text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-white border border-slate-200 rounded-lg p-10">
          <p className="text-4xl">📦</p>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">No orders yet</h2>
          <p className="mt-2 text-slate-500">
            Once you complete a checkout, your orders will appear here.
          </p>
          <Link
            to="/products"
            className="inline-block mt-6 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">My Orders</h2>
        <p className="mt-1 text-sm text-slate-500">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}, newest first
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    </div>
  );
};

export default Orders;
