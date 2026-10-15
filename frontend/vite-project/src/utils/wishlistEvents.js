// A tiny pub/sub on top of a DOM event.
//
// The wishlist count in the navbar has to react when a product is saved from
// the catalogue or removed on the wishlist page. The lab rules out Context /
// Redux for this feature, and the count is not shared state that components
// read - it is a "this changed, refresh" signal. A DOM event is enough and
// keeps every component owning its own data.

const WISHLIST_CHANGED_EVENT = 'shopkart:wishlist-changed';

// `count` is the authoritative number returned by the API. When it is present
// listeners can use it directly and skip a refetch entirely.
export const notifyWishlistChanged = (count) => {
  window.dispatchEvent(
    new CustomEvent(WISHLIST_CHANGED_EVENT, { detail: { count } })
  );
};

export const onWishlistChanged = (handler) => {
  window.addEventListener(WISHLIST_CHANGED_EVENT, handler);
  return () => window.removeEventListener(WISHLIST_CHANGED_EVENT, handler);
};
