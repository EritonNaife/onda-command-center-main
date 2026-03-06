import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/apiBaseUrl';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient(url: string, options: RequestOptions = {}): Promise<Response> {
  const { accessToken, org } = useAuthStore.getState();
  const { skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  if (!skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (org) {
    headers.set('X-Organization-ID', org.id);
  }

  let response = await fetch(url, { ...fetchOptions, headers });

  // Intercept 401 → refresh once → retry
  if (response.status === 401 && !skipAuth) {
    const refreshed = await useAuthStore.getState().refreshTokens();
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
      }
      response = await fetch(url, { ...fetchOptions, headers });
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiClient(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  return response.json();
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await apiClient(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json();
}

export async function apiPatch<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await apiClient(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json();
}

export async function apiPut<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await apiClient(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json();
}

export async function apiDelete<TResponse = void>(path: string): Promise<TResponse> {
  const response = await apiClient(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json();
}
