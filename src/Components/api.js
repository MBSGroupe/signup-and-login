const API_URL = import.meta.env.VITE_NEST_API_URL;

export const fetchWithRefresh = async (
  url,
  options,
  token,
  setAuthData
) => {
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
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
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
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } catch (error) {
      setAuthData(null);
      window.location.href = '/login';
      throw error;
    }
  }

  return response;
};