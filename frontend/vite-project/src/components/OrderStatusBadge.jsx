import React from 'react';

// The two chips an order carries.
//
// They answer different questions and are deliberately kept apart: `status` is
// where the order is in fulfilment, `paymentStatus` is whether the money
// arrived. An order can be PENDING_PAYMENT/PENDING, and one can be
// PLACED/PAID - collapsing them into a single label would lose that.

const PAYMENT_STYLES = {
  PAID: { label: 'Paid', className: 'bg-green-100 text-green-800 border-green-200' },
  PENDING: { label: 'Payment pending', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  FAILED: { label: 'Payment failed', className: 'bg-red-100 text-red-800 border-red-200' },
};

const ORDER_STYLES = {
  PENDING_PAYMENT: { label: 'Awaiting payment', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  PLACED: { label: 'Order placed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  SHIPPED: { label: 'Shipped', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200' },
};

// Falls back to the raw value so a status added on the server later shows up as
// readable text rather than disappearing.
const chipClass =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold';

export const OrderStatusBadge = ({ status }) => {
  const style = ORDER_STYLES[status] || {
    label: status || 'Unknown',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return <span className={`${chipClass} ${style.className}`}>{style.label}</span>;
};

export const PaymentStatusBadge = ({ paymentStatus }) => {
  const style = PAYMENT_STYLES[paymentStatus] || {
    label: paymentStatus || 'Unknown',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return <span className={`${chipClass} ${style.className}`}>{style.label}</span>;
};

export default OrderStatusBadge;
