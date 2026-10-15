import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CheckoutForm from '../components/CheckoutForm';
import OrderSummary from '../components/OrderSummary';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  createPaymentOrder,
  openRazorpayCheckout,
  verifyPayment,
  getErrorMessage,
} from '../services/orderService';
import {
  EMPTY_ADDRESS,
  validateShippingAddress,
  normalisePhone,
} from '../utils/orderValidation';

// Checkout runs in four steps, and the order they happen in is the whole point
// of this lab:
//
//   1. POST /orders/create-payment-order  - server prices the cart, snapshots
//      it into a PENDING order, and opens a Razorpay order
//   2. Razorpay's modal collects the card - the card never touches this app
//   3. POST /orders/verify-payment        - the server checks the HMAC
//      signature and, only on success, marks the order PAID and clears the cart
//   4. Navigate to the confirmation
//
// The cart is cleared in step 3's response, never in step 1. Closing the modal
// at step 2 therefore leaves the basket exactly as it was.

const Checkout = () => {
  const { user } = useAuth();
  const { cartItems, loading, error, subtotal, totalItems, clearCart } = useCart();
  const navigate = useNavigate();

  // ProtectedRoute has already waited for the user to load, so reading the
  // profile here in the initialiser is safe - and it seeds the two fields we
  // already know, without an effect that would blank the form on first render.
  const [address, setAddress] = useState(() => ({
    ...EMPTY_ADDRESS,
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  }));

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Set the instant the payment is verified. It stops the now-empty cart from
  // flashing the "your cart is empty" screen in the moment between clearing
  // the cart and the route change taking effect.
  const [placed, setPlaced] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setAddress((previous) => ({ ...previous, [name]: value }));

    // Clearing the message as soon as the field is edited means an error can
    // never outlive the value that caused it.
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || placed) return;

    const validationErrors = validateShippingAddress(address);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Please fix the highlighted fields before paying.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    // Sent as typed, minus formatting the server would only strip anyway.
    const shippingAddress = {
      fullName: address.fullName.trim(),
      phone: normalisePhone(address.phone),
      addressLine1: address.addressLine1.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode.trim(),
    };

    try {
      // --- Step 1: the server decides the amount ---------------------------
      // No total is sent. The server re-reads every product, prices the cart
      // itself, and returns the figure Razorpay was told to collect.
      const checkout = await createPaymentOrder(shippingAddress);

      // --- Step 2: Razorpay collects the payment ---------------------------
      let payment;
      try {
        payment = await openRazorpayCheckout({
          key: checkout.key,
          amount: checkout.amount,
          currency: checkout.currency,
          razorpayOrderId: checkout.razorpayOrderId,
          shopKartOrderId: checkout.shopKartOrderId,
          prefill: {
            name: shippingAddress.fullName,
            email: user?.email || '',
            contact: shippingAddress.phone,
          },
        });
      } catch (paymentError) {
        if (paymentError.dismissed) {
          // A cancelled payment is not a failure - the order is still pending
          // and the cart is untouched, so this is stated plainly and the
          // customer can simply press Pay Now again.
          setSubmitError('Payment cancelled. Your cart is unchanged — you can try again.');
          return;
        }
        throw paymentError;
      }

      // --- Step 3: the server verifies the signature -----------------------
      // Razorpay's success callback above only proves the modal closed well.
      // This call is the one that decides whether the order is real.
      const verified = await verifyPayment({
        shopKartOrderId: checkout.shopKartOrderId,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });

      // The server has already emptied the cart in the database. This mirrors
      // that locally so the navbar badge drops to zero immediately instead of
      // waiting for a refetch.
      setPlaced(true);
      clearCart();

      navigate(`/order-success/${verified.order._id}`, {
        replace: true,
        state: { order: verified.order },
      });
    } catch (err) {
      console.error('Checkout failed:', err);

      // The server validates the address again and returns a { field: message }
      // map. Showing it means the customer sees exactly what it objected to,
      // even if the client-side rules ever drift from it.
      const serverFieldErrors = err?.response?.data?.errors;
      if (serverFieldErrors && typeof serverFieldErrors === 'object') {
        setErrors(serverFieldErrors);
      }

      setSubmitError(
        getErrorMessage(err, 'We could not complete your payment. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Preparing your checkout..." />;
  }

  // Once the order is placed the cart is legitimately empty, so the empty
  // state must not be shown - navigation is already on its way.
  if (cartItems.length === 0 && !placed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-white border border-slate-200 rounded-lg p-10">
          <p className="text-4xl">🛒</p>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">
            There is nothing to check out
          </h2>
          <p className="mt-2 text-slate-500">
            Add a product to your cart and come back.
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
        <h2 className="text-3xl font-bold text-slate-800">Checkout</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your delivery details and complete the payment.
        </p>
      </div>

      {/* A cart that failed to load must not be paid for. */}
      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
          <p className="mt-1 text-xs text-red-600">
            Please return to your cart and reload it before paying.
          </p>
        </div>
      )}

      {submitError && (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p role="alert" className="text-sm font-medium text-amber-800">
            {submitError}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <CheckoutForm
          address={address}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitting={submitting}
          disabled={Boolean(error)}
        />

        <OrderSummary
          items={cartItems}
          subtotal={subtotal}
          totalItems={totalItems}
        />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Payments are processed by Razorpay in Test Mode. No real money is
        charged and no card details reach ShopKart.
      </p>
    </div>
  );
};

export default Checkout;
