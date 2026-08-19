import type { ApiErrorBody } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://express-services-backend.onrender.com/api';

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

/**
 * Client fetch centralise : construit l'URL, injecte Content-Type/Authorization,
 * parse le JSON et transforme une reponse non-OK en Error (message du backend si present).
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorBody = data as ApiErrorBody | null;
    throw new Error(errorBody?.message || errorBody?.error || 'Une erreur est survenue.');
  }

  return data as T;
}
