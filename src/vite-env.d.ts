/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_AUTO_LAYOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
