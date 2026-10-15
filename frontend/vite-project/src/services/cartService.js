import api from '../axiosCalls/axios';

// Every cart network call lives here. Each mutation returns the full cart, so
// the caller can replace its state from one response instead of guessing what
// changed or issuing a follow-up GET.

export const getCart = async () => {
  const response = await api.get('/cart');
  return response.data.cart || [];
};

// Adds one unit. The server creates the line at quantity 1, or increments an
// existing line, and answers with the whole cart either way.
export const addToCart = async (productId) => {
  const response = await api.post(`/cart/${productId}`);
  return response.data;
};

// Sets an absolute quantity (not a delta), so the server's stock check has the
// final number to validate against.
export const updateCartItem = async (productId, quantity) => {
  const response = await api.patch(`/cart/${productId}`, { quantity });
  return response.data;
};

export const removeFromCart = async (productId) => {
  const response = await api.delete(`/cart/${productId}`);
  return response.data;
};

export { getErrorMessage } from '../utils/helpers';
