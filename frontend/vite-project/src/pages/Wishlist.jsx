import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import WishlistCard from '../components/WishlistCard';
import Loader from '../components/Loader';
import { getWishlist, getErrorMessage } from '../services/wishlistService';
import { notifyWishlistChanged } from '../utils/wishlistEvents';

const Wishlist = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Bumped by "Try Again" to re-run the fetch effect.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Guards against an older slow request overwriting a newer fast one.
    let ignore = false;

    const fetchWishlist = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getWishlist();

        if (ignore) return;

        setProducts(data);
        // Keeps the navbar count honest after a refresh or a fresh login.
        notifyWishlistChanged(data.length);
      } catch (err) {
        if (ignore) return;

        console.error('Failed to load wishlist:', err);
        setProducts([]);
        setError(getErrorMessage(err, "We couldn't load your wishlist."));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchWishlist();

    return () => { ignore = true; };
  }, [reloadKey]);

  const handleRetry = useCallback(() => setReloadKey((key) => key + 1), []);

  // The card already confirmed the delete with the API, so the row is dropped
  // locally instead of refetching the whole list. Ids are compared as strings
  // so a populated ObjectId can never fail a reference equality check.
  const handleRemoved = useCallback((productId) => {
    setProducts((current) =>
      current.filter((product) => String(product._id) !== String(productId))
    );
  }, []);

  if (loading) {
    return <Loader message="Loading your wishlist..." />;
  }

  if (error) {
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

  if (products.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center bg-white border border-slate-200 rounded-lg p-10">
          <p className="text-4xl">❤️</p>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-slate-500">
            Save products you love and find them here later.
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">My Wishlist</h2>
        <p className="mt-1 text-sm text-slate-500">
          {products.length} {products.length === 1 ? 'product' : 'products'} saved
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <WishlistCard key={product._id} product={product} onRemoved={handleRemoved} />
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
