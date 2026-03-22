/**
 * API utility for making authenticated requests to the Absenin API
 * Handles cookie-based authentication, CSRF tokens, and automatic token refresh
 */

// Type declarations for browser globals
declare const window: {
  sessionStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    clear(): void;
  };
  location: {
    href: string;
  };
};

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
  };
}

type RequestOptions = Omit<RequestInit, 'credentials'> & {
  skipAuthRedirect?: boolean;
};

/**
 * Make an authenticated API request
 * Cookies are automatically sent/received via credentials: 'include'
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuthRedirect = false, ...fetchOptions } = options;

  // Get CSRF token from sessionStorage (set during login)
  const csrfToken = typeof window !== 'undefined' ? (window as any).sessionStorage?.getItem('csrfToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add CSRF token for state-changing requests
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method || 'GET')) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  try {
    const response = await fetch(endpoint, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Always include cookies for auth
    });

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && !skipAuthRedirect) {
      try {
        // Attempt to refresh the token
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (refreshResponse.ok) {
          const refreshData: ApiResponse = await refreshResponse.json();
          // Update CSRF token if provided
          if (refreshData.data?.csrf && typeof window !== 'undefined') {
            (window as any).sessionStorage?.setItem('csrfToken', refreshData.data.csrf);
          }
          // Retry the original request
          return apiRequest<T>(endpoint, { ...options, skipAuthRedirect: true });
        } else {
          // Refresh failed - redirect to login
          if (typeof window !== 'undefined') {
            (window as any).sessionStorage?.clear();
            (window as any).location = '/login';
          }
          throw new Error('Session expired');
        }
      } catch (refreshError) {
        // Refresh failed - redirect to login
        if (typeof window !== 'undefined') {
          (window as any).sessionStorage?.clear();
          (window as any).location = '/login';
        }
        throw new Error('Session expired');
      }
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * HTTP GET request
 */
export async function get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * HTTP POST request
 */
export async function post<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * HTTP PUT request
 */
export async function put<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * HTTP PATCH request
 */
export async function patch<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * HTTP DELETE request
 */
export async function del<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

export default { get, post, put, patch, delete: del };
