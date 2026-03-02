import { API_BASE_URL } from '@/lib/apiBaseUrl';

export interface SessionUserResponse {
  id: string;
  name: string;
  email?: string | null;
  username?: string | null;
  phone_number?: string | null;
  type: string;
  is_active: boolean;
}

export interface SessionOrganizationResponse {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

export interface SessionAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: SessionUserResponse;
  organizations: SessionOrganizationResponse[];
}

export interface SessionTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface SessionBootstrapResponse {
  user: SessionUserResponse;
  organizations: SessionOrganizationResponse[];
}

export class SessionClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SessionClientError';
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }
  }

  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new SessionClientError(
      response.status,
      await readErrorMessage(response),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loginSession(
  identifier: string,
  password: string,
): Promise<SessionAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/session/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier,
      password,
    }),
  });

  return parseResponse<SessionAuthResponse>(response);
}

export async function refreshSession(
  refreshToken: string,
): Promise<SessionTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/session/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  return parseResponse<SessionTokenResponse>(response);
}

export async function logoutSession(refreshToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/session/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  await parseResponse<void>(response);
}

export async function bootstrapSession(
  accessToken: string,
): Promise<SessionBootstrapResponse> {
  const response = await fetch(`${API_BASE_URL}/session/bootstrap`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseResponse<SessionBootstrapResponse>(response);
}
