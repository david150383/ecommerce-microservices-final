export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
    requestId?: string;
  };
}

export class ApiError extends Error {
  public code: string;
  public statusCode: number;
  public details?: unknown[];
  public requestId?: string;

  constructor(statusCode: number, code: string, message: string, details?: unknown[], requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

const BASE_URL = ''; // Relative path leverages Vite dev proxy & Nginx reverse proxy

function generateW3CTraceParent(): string {
  const traceId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const spanId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `00-${traceId}-${spanId}-01`;
}

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: localStorage.getItem('apex_access_token'),
    refreshToken: localStorage.getItem('apex_refresh_token'),
  };
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem('apex_access_token', accessToken);
  if (refreshToken !== undefined) {
    if (refreshToken) {
      localStorage.setItem('apex_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('apex_refresh_token');
    }
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem('apex_access_token');
  localStorage.removeItem('apex_refresh_token');
  localStorage.removeItem('apex_user');
}

// Single in-flight refresh promise to prevent token reuse collision from concurrent 401s
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { refreshToken } = getStoredTokens();
      // For web, refreshToken is stored in an HttpOnly cookie scoped to /auth and sent automatically.
      // If refreshToken is present in localStorage (fallback/mobile), include it in the body.
      const bodyPayload = refreshToken ? { refreshToken } : {};

      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });

      if (!refreshRes.ok) {
        clearStoredTokens();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return null;
      }

      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData.data?.accessToken;
      const newRefreshToken = refreshData.data?.refreshToken || refreshToken || '';

      if (newAccessToken) {
        setStoredTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      }

      clearStoredTokens();
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return null;
    } catch {
      clearStoredTokens();
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function parseResponseBody(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = getStoredTokens();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('x-correlation-id')) {
    headers.set('x-correlation-id', crypto.randomUUID());
  }

  if (!headers.has('traceparent')) {
    headers.set('traceparent', generateW3CTraceParent());
  }

  // Ensure cookies (including HttpOnly refresh_token) are always sent
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions);

  // Handle Token Expiry & Automatic Refresh Rotation
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: options.credentials || 'include',
      });

      const retryData = await parseResponseBody(retryResponse);

      if (!retryResponse.ok) {
        const errorCode = retryData?.error?.code || 'HTTP_ERROR';
        const errorMsg = retryData?.error?.message || retryResponse.statusText || 'An unexpected error occurred';
        throw new ApiError(retryResponse.status, errorCode, errorMsg, retryData?.error?.details, retryData?.error?.requestId);
      }

      return retryData;
    }
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorCode = data?.error?.code || 'HTTP_ERROR';
    const errorMsg = data?.error?.message || response.statusText || 'An unexpected error occurred';
    throw new ApiError(response.status, errorCode, errorMsg, data?.error?.details, data?.error?.requestId);
  }

  return data;
}
