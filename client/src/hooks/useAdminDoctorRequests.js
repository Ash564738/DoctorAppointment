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
      const [leaveRes, overtimeRes, swapRes] = await Promise.all([
        apiCall.get('/leave?limit=100'),
        apiCall.get('/overtime/all'),
        apiCall.get('/shift-swap/all'),
      ]);
      setLeaveRequests(leaveRes?.leaveRequests || []);
      setOvertimeRequests(overtimeRes?.data || []);
      setSwapRequests(swapRes?.data || []);
    } catch (err) {
      setError('Failed to fetch requests');
    }
    setLoading(false);
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
