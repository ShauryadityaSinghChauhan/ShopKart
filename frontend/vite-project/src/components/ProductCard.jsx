import React from 'react';
import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import AddToCartButton from './AddToCartButton';
import { formatPrice, FALLBACK_IMAGE, handleImageError, getStockStatus } from '../utils/helpers';

const ProductCard = ({ product, saved = false, onWishlistChange }) => {
  const stock = getStockStatus(product.stock);

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition duration-150">
      <img
        src={product.image || FALLBACK_IMAGE}
        alt={product.name}
        onError={handleImageError}
        className="h-48 w-full object-contain bg-slate-50 p-2"
      />

      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-base font-semibold text-slate-800 line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          {product.category}
        </p>
        <p className="mt-2 text-lg font-bold text-slate-900">
          {formatPrice(product.price)}
        </p>
        <p className={`mt-1 text-sm font-medium ${stock.className}`}>
          {stock.label}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            to={`/products/${product._id}`}
            className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition duration-150"
          >
            View Details
          </Link>

          <AddToCartButton product={product} />

          <WishlistButton
            productId={product._id}
            saved={saved}
            onChange={(next) => onWishlistChange?.(product._id, next)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
