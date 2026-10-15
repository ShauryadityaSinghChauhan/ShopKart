import api from '../axiosCalls/axios';

// Every wishlist network call lives here, so components never need to know
// about URLs or response shapes.

// GET /wishlist -> the populated products for the authenticated user
export const getWishlist = async () => {
  const response = await api.get('/wishlist');
  return response.data.wishlist || [];
};

// GET /wishlist/ids -> just the saved product ids, used to render the correct
// button state on the catalogue without downloading every product again.
export const getWishlistIds = async () => {
  const response = await api.get('/wishlist/ids');
  return response.data.productIds || [];
};

export const addToWishlist = async (productId) => {
  const response = await api.post(`/wishlist/${productId}`);
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await api.delete(`/wishlist/${productId}`);
  return response.data;
};

// Single toggle action used by the product cards: adds when absent, removes
// when present, and reports the resulting state in `saved`.
export const toggleWishlist = async (productId) => {
  const response = await api.patch(`/wishlist/${productId}/toggle`);
  return response.data;
};

export { getErrorMessage } from '../utils/helpers';
