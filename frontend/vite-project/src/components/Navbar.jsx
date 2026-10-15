import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getWishlistIds } from '../services/wishlistService';
import { onWishlistChanged } from '../utils/wishlistEvents';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // The cart count is read from shared state, not fetched here. The badge and
  // the cart page are therefore guaranteed to show the same number - the
  // provider updates both from a single server response.
  const { totalItems } = useCart();

  // The count is stored alongside the account it was fetched for, and the
  // badge only trusts it when the two match. That way signing out needs no
  // clearing, and a new login can never flash the previous account's count.
  const [wishlist, setWishlist] = useState({ userId: null, count: null });

  useEffect(() => {
    if (!user) return;

    let ignore = false;

    // null count means "not known yet", which keeps the badge from showing a
    // confident 0 before the first response lands.
    const apply = (count) =>
      setWishlist({ userId: user._id, count: typeof count === 'number' ? count : null });

    const fetchCount = async () => {
      try {
        const ids = await getWishlistIds();
        if (!ignore) apply(ids.length);
      } catch (err) {
        console.error('Failed to load wishlist count:', err);
        if (!ignore) apply(null);
      }
    };

    fetchCount();

    // Saving or removing anywhere in the app announces the new count, so the
    // badge stays live without any global state library.
    const unsubscribe = onWishlistChanged((event) => {
      if (ignore) return;
      const count = event.detail?.count;
      if (typeof count === 'number') apply(count);
      else fetchCount();
    });

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [user]);

  const wishlistCount =
    user && wishlist.userId === user._id ? wishlist.count : null;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition duration-150 ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`;

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white shadow-md">
      <h1 className="text-xl font-bold tracking-tight">ShopKart</h1>
      {user && (
        <div className="flex items-center gap-6">
          <NavLink to="/home" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
          <NavLink to="/wishlist" className={navLinkClass}>
            {wishlistCount === null ? 'Wishlist' : `Wishlist (${wishlistCount})`}
          </NavLink>
          <NavLink to="/cart" className={navLinkClass}>
            {`Cart (${totalItems})`}
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            Orders
          </NavLink>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition duration-150"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
