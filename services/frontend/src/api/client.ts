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

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('apex_access_token', accessToken);
  localStorage.setItem('apex_refresh_token', refreshToken);
}

export function clearStoredTokens(): void {
  localStorage.removeItem('apex_access_token');
  localStorage.removeItem('apex_refresh_token');
  localStorage.removeItem('apex_user');
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

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle Token Expiry & Refresh Rotation
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const { refreshToken } = getStoredTokens();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.data?.accessToken;
          const newRefreshToken = refreshData.data?.refreshToken || refreshToken;
          if (newAccessToken) {
            setStoredTokens(newAccessToken, newRefreshToken);
            headers.set('Authorization', `Bearer ${newAccessToken}`);
          }
          const retryRes = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
          if (retryRes.ok) {
            return await retryRes.json();
          }
        } else {
          clearStoredTokens();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
      } catch {
        clearStoredTokens();
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorCode = data?.error?.code || 'HTTP_ERROR';
    const errorMsg = data?.error?.message || response.statusText || 'An unexpected error occurred';
    throw new ApiError(response.status, errorCode, errorMsg, data?.error?.details, data?.error?.requestId);
  }

  return data;
}
