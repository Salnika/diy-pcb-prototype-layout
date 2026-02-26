import { createContext, useContext } from "react";

type StorageGateway = Readonly<{
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}>;

export const browserStorageGateway: StorageGateway = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const StorageGatewayContext = createContext<StorageGateway | null>(null);

export function useStorageGateway(): StorageGateway {
  return useContext(StorageGatewayContext) ?? browserStorageGateway;
}
