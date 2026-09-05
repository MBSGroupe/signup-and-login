
const API_URL = import.meta.env.VITE_NEST_API_URL;
export const fetchWithRefresh = async (url, options, token, setAuthData) => {
  const makeRequest = async (accessToken) => {
    console.log('📡 making request to:', url, 'with token:', accessToken);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    console.log('📡 response status:', response.status);
    return response;
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    console.log('🔴 got 401, attempting refresh');
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
                headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('🔄 refresh response status:', refreshResponse.status);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newToken = data.data?.accessToken || data.accessToken;
        console.log('🔄 new token:', newToken);
        if (newToken) {
          setAuthData((prev) => ({ ...prev, token: newToken }));
          response = await makeRequest(newToken);
        }
      } else {
        console.log('🔄 refresh failed with status:', refreshResponse.status);
        setAuthData(null);
        window.location.href = '/';
        throw new Error('Session expired');
      }
    } catch (error) {
      console.error('❌ error during refresh:', error);
      setAuthData(null);
      window.location.href = '/';
      throw error;
    }
  }

  return response;
};