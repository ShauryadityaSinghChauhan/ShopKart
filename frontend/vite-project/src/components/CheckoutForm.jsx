import React from 'react';
import { FIELD_LABELS } from '../utils/orderValidation';

// A single labelled input. Defined here rather than exported so the file still
// only exports a component, and so every field in the form is guaranteed to
// render its label, error and aria wiring the same way.
const Field = ({ name, value, error, onChange, disabled, ...inputProps }) => {
  const id = `checkout-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className={inputProps.wrapperClassName || ''}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {FIELD_LABELS[name]}
      </label>

      <input
        {...inputProps}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        // Tells a screen reader which field is wrong and why, instead of
        // leaving the error as a floating red line.
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm text-slate-800 shadow-sm transition duration-150 disabled:bg-slate-100 disabled:text-slate-500 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
        } focus:outline-none focus:ring-1`}
      />

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

// The shipping form. It is fully controlled by the Checkout page, which owns
// the address because it is the same object that gets posted - keeping a second
// copy here would only create somewhere for the two to disagree.
const CheckoutForm = ({ address, errors, onChange, onSubmit, submitting, disabled }) => {
  return (
    <form
      onSubmit={onSubmit}
      // Validation is ours, not the browser's: novalidate keeps the native
      // bubble from firing first and hiding our inline messages.
      noValidate
      className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
    >
      <h3 className="text-lg font-bold text-slate-800">Shipping Address</h3>
      <p className="mt-1 text-sm text-slate-500">
        Where should we deliver this order?
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Shauryaditya Singh"
          value={address.fullName}
          error={errors.fullName}
          onChange={onChange}
          disabled={disabled}
          wrapperClassName="sm:col-span-2"
        />

        <Field
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="9876543210"
          value={address.phone}
          error={errors.phone}
          onChange={onChange}
          disabled={disabled}
        />

        <Field
          name="pincode"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="560001"
          maxLength={6}
          value={address.pincode}
          error={errors.pincode}
          onChange={onChange}
          disabled={disabled}
        />

        <Field
          name="addressLine1"
          type="text"
          autoComplete="address-line1"
          placeholder="Flat 4B, 12 MG Road"
          value={address.addressLine1}
          error={errors.addressLine1}
          onChange={onChange}
          disabled={disabled}
          wrapperClassName="sm:col-span-2"
        />

        <Field
          name="city"
          type="text"
          autoComplete="address-level2"
          placeholder="Bengaluru"
          value={address.city}
          error={errors.city}
          onChange={onChange}
          disabled={disabled}
        />

        <Field
          name="state"
          type="text"
          autoComplete="address-level1"
          placeholder="Karnataka"
          value={address.state}
          error={errors.state}
          onChange={onChange}
          disabled={disabled}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || disabled}
        className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150 disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        {submitting ? 'Opening payment…' : 'Pay Now'}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        You will be taken to Razorpay's secure checkout to complete the payment.
      </p>
    </form>
  );
};

export default CheckoutForm;
