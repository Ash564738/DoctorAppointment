import React, { useEffect, useState } from 'react';
import { apiCall } from '../helper/apiCall';

const useAdminDoctorRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiCall.get('/leave?limit=100'),
        apiCall.get('/overtime/all'),
        apiCall.get('/shift-swap/all'),
      ]);

      const [leaveRes, overtimeRes, swapRes] = results;

      if (leaveRes.status === 'fulfilled') {
        setLeaveRequests(leaveRes.value?.leaveRequests || []);
      } else {
        setLeaveRequests([]);
      }

      if (overtimeRes.status === 'fulfilled') {
        setOvertimeRequests(overtimeRes.value?.data || []);
      } else {
        setOvertimeRequests([]);
      }

      if (swapRes.status === 'fulfilled') {
        setSwapRequests(swapRes.value?.data || []);
      } else {
        setSwapRequests([]);
        const status = swapRes.reason?.response?.status;
        if (status === 403) {
          setError('Shift swaps: Admin only. Please sign in with an admin account.');
        } else {
          setError('Failed to fetch requests');
        }
      }
    } catch (err) {
      setError('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return {
    leaveRequests,
    overtimeRequests,
    swapRequests,
    loading,
    error,
    refetch: fetchAll,
  };
};

export default useAdminDoctorRequests;
