const API_URL = import.meta.env.VITE_NEST_API_URL;

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const fetchWithRefresh = async (url, options, token, setAuthData, authHint = {}) => {
  const makeRequest = async (accessToken) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    const hintedType = authHint?.type;
    const tokenType = token ? decodeJwtPayload(token)?.type : null;
    const accountType = hintedType || tokenType || 'user';
    const refreshPath = accountType === 'admin' ? '/auth/admin/refresh' : '/auth/refresh';

    try {
      const refreshResponse = await fetch(`${API_URL}${refreshPath}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newToken = data.data?.accessToken || data.accessToken;
        if (newToken) {
          setAuthData((prev) => ({ ...prev, token: newToken }));
          response = await makeRequest(newToken);
        }
      } else {
        setAuthData(null);
        window.location.href = '/';
        throw new Error('Session expired');
      }
    } catch (error) {
      setAuthData(null);
      window.location.href = '/';
      throw error;
    }
  }

  return response;
};