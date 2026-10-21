import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for data fetching with loading, error, data states and refetch function
 * @param {Function} fetchFn - Async function returning a promise (e.g. API call)
 * @param {boolean} [immediate=true] - Whether to fetch immediately on mount
 * @param {Array} [deps=[]] - Optional dependency array
 */
export function useFetch(fetchFn, immediate = true, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchFn(...args);
        // Handle axios response wrapper
        const result = response && response.data !== undefined ? response.data : response;
        setData(result);
        return result;
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to load data. Please check connection and try again.';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn]
  );

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate, ...deps]);

  return { data, loading, error, refetch: execute, setData };
}

export default useFetch;
