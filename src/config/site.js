// The public website, for "View website" links. Defaults to the deployed site,
// same convention as VITE_API_BASE_URL — override with VITE_SITE_URL to point
// a local admin at a local website (http://localhost:5183) instead.
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://giaeducare.com';
