import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Loader from '../components/Loader';
import WishlistButton from '../components/WishlistButton';
import AddToCartButton from '../components/AddToCartButton';
import { getProductById, getErrorMessage } from '../services/productService';
import { getWishlistIds } from '../services/wishlistService';
import { formatPrice, FALLBACK_IMAGE, handleImageError } from '../utils/helpers';

const ProductDetails = () => {
  // Reads the :id segment from the URL (/products/:id)
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProductById(id);
        if (ignore) return;
        setProduct(data);
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load product:', err);
        setProduct(null);
        setError(getErrorMessage(err, 'Something went wrong while loading this product.'));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProduct();

    return () => { ignore = true; };
  }, [id]);

  // A separate effect so a wishlist hiccup never blocks the product itself
  // from rendering - the button just starts out as "not saved".
  useEffect(() => {
    let ignore = false;

    const fetchSavedState = async () => {
      try {
        const ids = await getWishlistIds();
        if (!ignore) setIsSaved(ids.includes(id));
      } catch (err) {
        console.error('Failed to load wishlist ids:', err);
      }
    };

    fetchSavedState();

    return () => { ignore = true; };
  }, [id]);

  if (loading) {
    return <Loader message="Loading product..." />;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-red-700 font-medium">{error}</p>
          <Link
            to="/products"
            className="inline-block mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const inStock = product.stock > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/products" className="text-sm text-blue-600 hover:underline">
        ← Back to Products
      </Link>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <img
          src={product.image || FALLBACK_IMAGE}
          alt={product.name}
          onError={handleImageError}
          className="w-full h-80 object-contain bg-slate-50 rounded-md p-4"
        />

        <div className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {product.category}
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-800">{product.name}</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">{product.description}</p>

          <p className="mt-6 text-3xl font-bold text-slate-900">
            {formatPrice(product.price)}
          </p>

          <p className={`mt-2 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
            {inStock ? `${product.stock} units in stock` : 'Out of stock'}
          </p>

          <AddToCartButton
            product={product}
            size="lg"
            className="mt-6 w-full sm:w-64"
          />

          <WishlistButton
            productId={product._id}
            saved={isSaved}
            onChange={setIsSaved}
            className="mt-3 sm:w-64"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
