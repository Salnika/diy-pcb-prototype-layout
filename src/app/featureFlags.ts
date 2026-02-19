export const featureFlags = {
  // Enabled by default. Set VITE_FEATURE_AUTO_LAYOUT=false to hide it.
  autoLayout: import.meta.env.VITE_FEATURE_AUTO_LAYOUT !== "false",
};
