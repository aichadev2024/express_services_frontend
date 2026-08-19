"use client";

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * Lit un token depuis localStorage de facon synchronisee (useSyncExternalStore) :
 * pas besoin d'un useEffect + setState pour lire une valeur client-only, donc pas
 * de rendu en cascade et un rendu serveur/client coherent des le depart.
 */
export function useStoredToken(key: string): string | null {
  return useSyncExternalStore(subscribe, () => localStorage.getItem(key), getServerSnapshot);
}

export function setStoredToken(key: string, value: string | null | undefined): void {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
  emitChange();
}
