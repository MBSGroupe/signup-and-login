import { useError } from '../Context/ErrorContext';

export const useApi = () => {
  const { showError, showWarning, showSuccess } = useError();

  const callApi = async (apiCall, options = {}) => {
    const { 
      showSuccessMessage = false, 
      successMessage = 'Operation completed successfully'
    } = options;
    
    try {
      const response = await apiCall();
      const data = await response.json();

      // Check for HTTP errors or explicit success:false from server
      if (!response.ok || data.success === false) {
        // If status is 400, treat as business rule violation → warning
        if (response.status === 400) {
          console.log('Showing WARNING popup (business rule):', data.message || 'Unable to complete operation');
          showWarning(data.message || 'Unable to complete operation');
        } else {
          // All other status codes (401, 403, 404, 500, etc.) → error
          console.log('Showing ERROR popup:', data.message || 'An error occurred');
          showError(data.message || 'An error occurred');
        }
        return null;
      }

      // LEVEL 2: Legacy business logic check (data.data.success) – kept for backward compatibility
      if (data.data && data.data.success === false) {
        console.log('Showing WARNING popup (legacy business check):', data.data.message || 'Unable to complete operation');
        showWarning(data.data.message || 'Unable to complete operation');
        return null;
      }

      // Success case (both layers succeeded)
      if (showSuccessMessage) {
        console.log('Showing SUCCESS popup:', successMessage);
        showSuccess(successMessage);
      }

      // Return just the actual data
      return data.data?.data || data.data;
    } catch (error) {
      console.log('Showing ERROR popup (network):', error.message);
      const message = error.message === 'Failed to fetch' 
        ? 'Network error. Please check your connection.'
        : 'An unexpected error occurred';
      showError(message);
      return null;
    }
  };

  return { callApi };
};