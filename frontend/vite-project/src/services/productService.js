import api from '../axiosCalls/axios';

// Every product-related network call lives here, so components never
// need to know about URLs, query params or response shapes.

export const getProducts = async ({ search, category, sort } = {}) => {
  const params = {};

  if (search && search.trim()) params.search = search.trim();
  if (category) params.category = category;
  if (sort) params.sort = sort;

  const response = await api.get('/products', { params });
  return response.data.products || [];
};

export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data.product;
};

// Kept for reference / future admin screens.
export const createProduct = async (product) => {
  const response = await api.post('/products', product);
  return response.data.product;
};

// Pulls a readable message out of an axios error (backend sends `message`).
// Re-exported from utils/helpers so existing imports keep working.
export { getErrorMessage } from '../utils/helpers';
