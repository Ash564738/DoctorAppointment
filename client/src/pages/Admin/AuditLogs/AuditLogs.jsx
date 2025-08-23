import React, { useState, useEffect } from 'react';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import './AuditLogs.css';

const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    severity: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });

      // Add filters to params
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          if (key === 'action') {
            params.append('action', filters[key]);
          } else if (key === 'user') {
            params.append('search', filters[key]); // Search in user details
          } else if (key === 'severity') {
            params.append('severity', filters[key]);
          } else if (key === 'dateFrom') {
            params.append('startDate', filters[key]);
          } else if (key === 'dateTo') {
            params.append('endDate', filters[key]);
          }
        }
      });

      const response = await apiCall.get(`/audit-logs?${params.toString()}`);
      
      if (response.success) {
        // Transform the data to match the expected format
        const transformedLogs = response.data.logs.map(log => ({
          _id: log._id,
          timestamp: log.createdAt,
          user: log.userId ? `${log.userId.firstname} ${log.userId.lastname} (${log.userId.email})` : 'System',
          action: formatActionName(log.action),
          details: log.details?.description || log.details || 'No details available',
          severity: log.severity || 'medium',
          ipAddress: log.metadata?.ipAddress || log.ipAddress || 'N/A',
          userAgent: log.metadata?.userAgent || 'N/A'
        }));
        
        setAuditLogs(transformedLogs);
        setTotalPages(Math.ceil(response.data.total / 20));
      } else {
        throw new Error(response.message || 'Failed to fetch audit logs');
      }
      
    } catch (err) {
      console.error('Fetch audit logs error:', err);
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      user: '',
      severity: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  const getSeverityClassName = (severity) => {
    const baseClass = 'auditLogs_severity';
    switch (severity?.toLowerCase()) {
      case 'low':
        return `${baseClass} auditLogs_severityLow`;
      case 'medium':
        return `${baseClass} auditLogs_severityMedium`;
      case 'high':
        return `${baseClass} auditLogs_severityHigh`;
      case 'critical':
        return `${baseClass} auditLogs_severityCritical`;
      default:
        return `${baseClass} auditLogs_severityLow`;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatActionName = (action) => {
    const actionMap = {
      'user_login': 'User Login',
      'user_logout': 'User Logout',
      'user_created': 'User Account Created',
      'user_updated': 'User Account Updated',
      'user_deleted': 'User Account Deleted',
      'password_changed': 'Password Changed',
      'password_reset': 'Password Reset',
      'role_changed': 'Role Changed',
      'doctor_approved': 'Doctor Approved',
      'doctor_rejected': 'Doctor Rejected',
      'doctor_suspended': 'Doctor Suspended',
      'appointment_created': 'Appointment Created',
      'appointment_updated': 'Appointment Updated',
      'appointment_cancelled': 'Appointment Cancelled',
      'appointment_completed': 'Appointment Completed',
      'medical_record_accessed': 'Patient Record Access',
      'medical_record_created': 'Medical Record Created',
      'medical_record_updated': 'Medical Record Updated',
      'medical_record_deleted': 'Medical Record Deleted',
      'prescription_created': 'Prescription Created',
      'prescription_updated': 'Prescription Updated',
      'payment_processed': 'Payment Processed',
      'payment_refunded': 'Payment Refunded',
      'system_settings_changed': 'System Settings Changed',
      'backup_created': 'System Backup',
      'data_exported': 'Data Export',
      'unauthorized_access_attempt': 'Failed Login Attempt',
      'suspicious_activity_detected': 'Suspicious Activity',
      'security_setting_changed': 'Security Setting Changed',
      'file_uploaded': 'File Upload',
      'file_downloaded': 'File Download',
      'file_deleted': 'File Deleted'
    };
    
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="auditLogs_page">
      <NavbarWrapper />
      <div className="auditLogs_container">
        <div className="auditLogs_header">
          <h2 className="auditLogs_title">Audit Logs</h2>
          <p className="auditLogs_subtitle">Track sensitive actions and system changes for security monitoring</p>
        </div>

        {/* Filters */}
        <div className="auditLogs_filters">
          <div className="auditLogs_filterGroup">
            <label className="auditLogs_filterLabel">Action Type</label>
            <select 
              className="auditLogs_filterSelect"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="user_login">User Login</option>
              <option value="user_logout">User Logout</option>
              <option value="user_created">User Account Created</option>
              <option value="user_updated">User Account Updated</option>
              <option value="user_deleted">User Account Deleted</option>
              <option value="doctor_approved">Doctor Approved</option>
              <option value="appointment_created">Appointment Created</option>
              <option value="appointment_updated">Appointment Updated</option>
              <option value="appointment_cancelled">Appointment Cancelled</option>
              <option value="medical_record_accessed">Patient Record Access</option>
              <option value="prescription_created">Prescription Created</option>
              <option value="payment_processed">Payment Processed</option>
              <option value="system_settings_changed">System Settings Changed</option>
              <option value="backup_created">System Backup</option>
              <option value="data_exported">Data Export</option>
              <option value="unauthorized_access_attempt">Failed Login Attempt</option>
              <option value="suspicious_activity_detected">Suspicious Activity</option>
            </select>
          </div>

          <div className="auditLogs_filterGroup">
            <label className="auditLogs_filterLabel">User</label>
            <input 
              type="text"
              className="auditLogs_filterInput"
              placeholder="Filter by user email"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
            />
          </div>

          <div className="auditLogs_filterGroup">
            <label className="auditLogs_filterLabel">Severity</label>
            <select 
              className="auditLogs_filterSelect"
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="auditLogs_filterGroup">
            <label className="auditLogs_filterLabel">Date From</label>
            <input 
              type="date"
              className="auditLogs_filterInput"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="auditLogs_filterGroup">
            <label className="auditLogs_filterLabel">Date To</label>
            <input 
              type="date"
              className="auditLogs_filterInput"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          <button className="auditLogs_filterButton" onClick={fetchAuditLogs}>
            Apply Filters
          </button>
          
          <button className="auditLogs_clearButton" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="auditLogs_loadingContainer">
            <div className="auditLogs_spinner"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="auditLogs_errorMessage">
            {error}
          </div>
        ) : auditLogs.length > 0 ? (
          <>
            <table className="auditLogs_table">
              <thead className="auditLogs_tableHeader">
                <tr>
                  <th className="auditLogs_tableHeaderCell">Timestamp</th>
                  <th className="auditLogs_tableHeaderCell">User</th>
                  <th className="auditLogs_tableHeaderCell">Action</th>
                  <th className="auditLogs_tableHeaderCell">Details</th>
                  <th className="auditLogs_tableHeaderCell">Severity</th>
                  <th className="auditLogs_tableHeaderCell">IP Address</th>
                </tr>
              </thead>
              <tbody className="auditLogs_tableBody">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="auditLogs_tableRow">
                    <td className="auditLogs_tableCell">
                      <span className="auditLogs_timestamp">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </td>
                    <td className="auditLogs_tableCell">
                      <span className="auditLogs_user">
                        {log.user}
                      </span>
                    </td>
                    <td className="auditLogs_tableCell">
                      <span className="auditLogs_action">
                        {log.action}
                      </span>
                    </td>
                    <td className="auditLogs_tableCell">
                      <span className="auditLogs_details">
                        {log.details}
                      </span>
                    </td>
                    <td className="auditLogs_tableCell">
                      <span className={getSeverityClassName(log.severity)}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="auditLogs_tableCell">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="auditLogs_pagination">
              <button 
                className="auditLogs_paginationButton"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </button>
              
              <span className="auditLogs_paginationInfo">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                className="auditLogs_paginationButton"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="auditLogs_noDataMessage">
            <p>No audit logs found for the selected criteria.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AuditLogs;
