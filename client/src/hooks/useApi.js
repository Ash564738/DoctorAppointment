import { useState } from "react";
import { apiCall } from "../helper/apiCall";

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = async (method, url, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall[method](url, data);
      setLoading(false);
      return res;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { request, loading, error };
}
