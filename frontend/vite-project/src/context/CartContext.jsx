import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  addToCart as addToCartRequest,
  getCart,
  getErrorMessage,
  removeFromCart as removeFromCartRequest,
  updateCartItem as updateCartItemRequest,
} from '../services/cartService';

// The cart is the first thing in ShopKart that genuinely belongs to the whole
// application: the navbar badge, the product cards, the cart page and the
// order summary all read the same numbers. Keeping a copy in each of them is
// what produces "Cart (2)" next to a page showing three items, so there is one
// provider and every component reads from it.
//
// The split: the backend owns the cart (it enforces stock and survives a
// refresh), and this context is the single client-side mirror of it. Every
// mutation replaces that mirror with the cart the server just returned, so the
// two cannot drift.

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [error, setError] = useState('');

  // Which account the items currently in state belong to. Comparing it with the
  // logged-in user is what tells us the cart still needs loading - so logging
  // out needs no state reset at all, it just stops matching.
  const [loadedUserId, setLoadedUserId] = useState(null);

  // Set by "Try Again" so the page shows its loading state during a manual
  // reload, and cleared when that request settles.
  const [reloading, setReloading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Counts requests so a slow one cannot land after a newer one. Without this,
  // logging out and back in as someone else could leave the first account's
  // cart on screen when its earlier response arrives late.
  const requestId = useRef(0);

  // The only fetch of GET /cart in the app. Every component reads the result
  // through this provider instead of calling the API itself.
  useEffect(() => {
    if (!user) return;

    const id = ++requestId.current;

    const load = async () => {
      try {
        const items = await getCart();
        if (id !== requestId.current) return;
        setCartItems(items);
        setError('');
      } catch (err) {
        if (id !== requestId.current) return;
        console.error('Failed to load cart:', err);
        setCartItems([]);
        setError(getErrorMessage(err, "We couldn't load your cart."));
      } finally {
        if (id === requestId.current) {
          setLoadedUserId(user._id);
          setReloading(false);
        }
      }
    };

    load();
  }, [user, reloadKey]);

  // Re-runs the effect above. Called from event handlers, never during render.
  const refreshCart = useCallback(() => {
    setReloading(true);
    setReloadKey((key) => key + 1);
  }, []);

  // Mutations deliberately re-throw. The context still owns the state, but the
  // component that triggered the action needs to know it failed so it can show
  // its own error and clear its own pending flag.
  const addToCart = useCallback(async (productId) => {
    const data = await addToCartRequest(productId);
    setCartItems(data.cart || []);
    return data;
  }, []);

  const updateQuantity = useCallback(async (productId, quantity) => {
    const data = await updateCartItemRequest(productId, quantity);
    setCartItems(data.cart || []);
    return data;
  }, []);

  const removeFromCart = useCallback(async (productId) => {
    const data = await removeFromCartRequest(productId);
    setCartItems(data.cart || []);
    return data;
  }, []);

  // Empties the local mirror only - it makes no request.
  //
  // The server clears the cart itself inside the payment verification, at the
  // moment the signature is confirmed valid. This exists so the navbar badge
  // and the cart page drop to zero straight away instead of showing a cart the
  // database no longer has. Calling it before that verification would be a lie
  // in the other direction: an empty badge over a full cart.
  const clearCart = useCallback(() => {
    // Invalidating the in-flight request id means a GET /cart that was already
    // on its way cannot land afterwards and refill what was just emptied.
    requestId.current += 1;
    setCartItems([]);
    setError('');
  }, []);

  // Everything below is derived on each render rather than stored, so none of
  // it can fall out of step with the lines it describes. A logged-out visitor
  // simply has no cart, which is why signing out needs no extra bookkeeping.
  const items = useMemo(() => (user ? cartItems : []), [user, cartItems]);

  const loading = Boolean(user) && (reloading || loadedUserId !== user._id);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.product?.price || 0) * (item.quantity || 0),
        0
      ),
    [items]
  );

  // Lets a component ask "is this product already in the cart?" without
  // scanning the array itself.
  const quantityOf = useCallback(
    (productId) => {
      const line = items.find(
        (item) => String(item.product?._id) === String(productId)
      );
      return line ? line.quantity : 0;
    },
    [items]
  );

  const value = {
    cartItems: items,
    loading,
    error: user ? error : '',
    totalItems,
    subtotal,
    refreshCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    quantityOf,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
