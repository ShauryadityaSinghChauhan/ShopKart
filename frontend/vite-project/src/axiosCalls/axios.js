import axios from "axios";

// The browser always talks to the API on a relative path. In production the
// `web` and `api` services sit behind one Vercel domain (see vercel.json), so
// "/api" is same-origin there. In development Vite proxies "/api" to the
// Express server on port 3333 (see vite.config.js). Keeping both environments
// on the same relative path is what lets the auth cookie stay same-origin in
// production instead of needing SameSite=None.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export default api;
