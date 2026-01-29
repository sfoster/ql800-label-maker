// Configuration module - runtime configuration values
// Initialized from HTML template at page load

let _baseURL = null;

export function initConfig(configData) {
  if (_baseURL !== null) {
    console.warn("Config already initialized, ignoring re-initialization");
    return;
  }
  _baseURL = configData.baseURL;
  console.log("Config initialized with baseURL:", _baseURL);
}

export function getBaseURL() {
  if (_baseURL === null) {
    throw new Error("Config not initialized - call initConfig() first");
  }
  return _baseURL;
}

// For debugging in browser console
if (typeof window !== 'undefined') {
  window.__config = { getBaseURL, initConfig };
}
