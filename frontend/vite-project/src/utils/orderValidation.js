// The shipping rules, in one place on the client.
//
// These mirror backend/controllers/order.controller.js exactly. The browser
// copy exists so the customer sees a problem next to the input that caused it,
// but it is a convenience, not a guarantee - an HTTP client can post anything,
// which is why the server validates the same fields again and is the copy that
// actually decides whether an order is created.

export const REQUIRED_ADDRESS_FIELDS = [
  'fullName',
  'phone',
  'addressLine1',
  'city',
  'state',
  'pincode',
];

export const FIELD_LABELS = {
  fullName: 'Full name',
  phone: 'Phone',
  addressLine1: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
};

// Accepts +91 98765 43210, 098765-43210, 9876543210 ... strips everything that
// is not a digit, drops the country code or trunk zero, and hands back the ten
// digits underneath.
export const normalisePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalisePhone(value));

export const isValidPincode = (value) => /^\d{6}$/.test(String(value ?? '').trim());

// Returns { field: message }, so each message can be attached to its own input.
export const validateShippingAddress = (address) => {
  const errors = {};
  const values = address || {};

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    const value = values[field];
    if (typeof value !== 'string' || value.trim() === '') {
      errors[field] = `${FIELD_LABELS[field]} is required`;
    }
  }

  // Only checked when present, so an empty phone reports one problem, not two.
  if (!errors.phone && !isValidPhone(values.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number';
  }

  if (!errors.pincode && !isValidPincode(values.pincode)) {
    errors.pincode = 'Pincode must contain 6 digits';
  }

  return errors;
};

export const isAddressComplete = (address) =>
  Object.keys(validateShippingAddress(address)).length === 0;

export const EMPTY_ADDRESS = {
  fullName: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};
