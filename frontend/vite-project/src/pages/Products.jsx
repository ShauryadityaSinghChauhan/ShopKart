import React, { useEffect, useState, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import { getProducts, getErrorMessage } from '../services/productService';
import { getWishlistIds } from '../services/wishlistService';

const Products = () => {
  // The raw text box value and the debounced value are kept separate, so the
  // input stays responsive while the API is only hit once typing pauses.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [sort, setSort] = useState('');

  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Bumped by the "Try Again" button to re-run the fetch effect.
  const [reloadKey, setReloadKey] = useState(0);

  // Which of these products the user has already saved. A Set keeps the
  // per-card lookup O(1) instead of scanning the wishlist for every card.
  const [savedIds, setSavedIds] = useState(() => new Set());

  useEffect(() => {
    let ignore = false;

    const fetchSavedIds = async () => {
      try {
        const ids = await getWishlistIds();
        if (!ignore) setSavedIds(new Set(ids));
      } catch (err) {
        // Not fatal: every card simply renders as not-saved, and the toggle
        // response corrects the button if the user clicks one.
        console.error('Failed to load wishlist ids:', err);
      }
    };

    fetchSavedIds();

    return () => { ignore = true; };
  }, []);

  const handleWishlistChange = useCallback((productId, isSaved) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (isSaved) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    // Guards against an older slow request overwriting a newer fast one.
    let ignore = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProducts({
          search,
          category: category === 'All Categories' ? '' : category,
          sort
        });

        if (ignore) return;
        setProducts(data);
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load products:', err);
        setProducts([]);
        setError(getErrorMessage(err, 'Something went wrong while loading products.'));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProducts();

    return () => { ignore = true; };
  }, [search, category, sort, reloadKey]);

  const handleRetry = useCallback(() => setReloadKey((key) => key + 1), []);

  const renderResults = () => {
    if (loading) {
      return <Loader message="Loading products..." />;
    }

    if (error) {
      return (
        <div className="text-center py-16 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-600 font-medium">No products found.</p>
          <p className="mt-1 text-sm text-slate-500">
            Try a different search term or category.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            saved={savedIds.has(product._id)}
            onWishlistChange={handleWishlistChange}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Products</h2>
        <p className="mt-1 text-sm text-slate-500">
          Browse the ShopKart catalogue.
        </p>
      </div>

      <SearchBar
        search={searchInput}
        onSearchChange={setSearchInput}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
      />

      {/* Count is hidden while loading so it never shows a stale number */}
      {!loading && !error && products.length > 0 && (
        <p className="mb-4 text-sm text-slate-500">
          Showing {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
      )}

      {renderResults()}
    </div>
  );
};

export default Products;
