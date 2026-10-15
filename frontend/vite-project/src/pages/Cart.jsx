import React from 'react';
import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import Loader from '../components/Loader';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/helpers';

const Cart = () => {
  // Nothing is fetched here. The provider already loaded the cart and keeps it
  // current after every mutation, so this page is a view over shared state.
  const { cartItems, loading, error, totalItems, subtotal, refreshCart } = useCart();

  if (loading) {
    return <Loader message="Loading your cart..." />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-lg font-semibold text-red-800">Something went wrong.</p>
          <p className="mt-2 text-red-700">{error}</p>
          <button
            type="button"
            onClick={refreshCart}
            className="mt-6 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-white border border-slate-200 rounded-lg p-10">
          <p className="text-4xl">🛒</p>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">Your cart is empty</h2>
          <p className="mt-2 text-slate-500">
            Looks like you haven't added anything yet.
          </p>
          <Link
            to="/products"
            className="inline-block mt-6 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">My Cart</h2>
        <p className="mt-1 text-sm text-slate-500">
          {cartItems.length} {cartItems.length === 1 ? 'product' : 'products'},{' '}
          {totalItems} {totalItems === 1 ? 'unit' : 'units'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="flex flex-col gap-3">
          {cartItems.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}
        </div>

        {/* Sticky so the totals stay visible while scrolling a long cart. */}
        <aside className="lg:sticky lg:top-6 bg-white border border-slate-200 rounded-lg shadow-sm p-5">
          <h3 className="text-lg font-bold text-slate-800">Order Summary</h3>

          <dl className="mt-4 space-y-2 text-sm">
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
            <span className="text-base font-semibold text-slate-800">Subtotal</span>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatPrice(subtotal)}
            </span>
          </div>

          <Link
            to="/checkout"
            className="mt-5 block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150 text-center"
          >
            Proceed to Checkout
          </Link>

          <Link
            to="/products"
            className="mt-3 block text-center text-sm font-medium text-blue-700 hover:underline"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
