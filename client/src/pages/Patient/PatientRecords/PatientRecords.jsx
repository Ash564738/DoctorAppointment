import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserOutlined, 
  EyeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  DownloadOutlined,
  UploadOutlined
} from '../../../components/Common/Icons/Icons';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import Loading from '../../../components/Common/Loading/Loading';
import Empty from '../../../components/Common/Empty/Empty';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import './PatientRecords.css';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';

const PatientRecords = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadRecordId, setUploadRecordId] = useState(null);
  const [stats, setStats] = useState({
    totalRecords: 0,
    recentRecords: 0,
    totalPrescriptions: 0,
    totalDiagnoses: 0
  });
  const getDiagnosisArray = useCallback((diagnosis) => {
    if (!diagnosis) return [];
    if (Array.isArray(diagnosis)) {
      return diagnosis
        .map(d => (typeof d === 'string' ? d : d?.description || ''))
        .filter(Boolean);
    }
    if (typeof diagnosis === 'string') {
      return diagnosis.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, []);
  const calculateStats = useCallback((recordsData) => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentRecords = recordsData.filter(record => 
      new Date(record.createdAt) >= oneMonthAgo
    ).length;
    const totalPrescriptions = recordsData.reduce((total, record) => {
      const rx = Array.isArray(record.prescriptionIds) ? record.prescriptionIds : [];
      const withMeds = rx.filter(p => Array.isArray(p?.medications) && p.medications.length > 0);
      return total + withMeds.length;
    }, 0);
    const allDx = recordsData.flatMap(r => getDiagnosisArray(r.diagnosis));
    const uniqueDiagnoses = new Set(allDx).size;
    setStats({
      totalRecords: recordsData.length,
      recentRecords,
      totalPrescriptions,
      totalDiagnoses: uniqueDiagnoses
    });
  }, [getDiagnosisArray]);
  const fetchMedicalRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/medical-record/patient');
      
      if (response.success) {
        setRecords(response.medicalRecords || []);
        calculateStats(response.medicalRecords || []);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast.error('Failed to fetch medical records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);
  const filterRecords = useCallback(() => {
    let filtered = records;
    if (searchTerm) {
      filtered = filtered.filter(record => {
        let diagnosisText = '';
        if (Array.isArray(record.diagnosis)) {
          diagnosisText = record.diagnosis.map(d => d?.description || '').join(' ');
        } else if (typeof record.diagnosis === 'string') {
          diagnosisText = record.diagnosis;
        }

        return (
          diagnosisText.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (record.symptoms && record.symptoms.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (record.treatment && record.treatment.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (record.doctorId?.firstname && record.doctorId.firstname.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (record.doctorId?.lastname && record.doctorId.lastname.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let dateThreshold;
      
      switch (dateFilter) {
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'year':
          dateThreshold = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          dateThreshold = null;
      }
      
      if (dateThreshold) {
        filtered = filtered.filter(record => new Date(record.createdAt) >= dateThreshold);
      }
    }
    
    setFilteredRecords(filtered);
  }, [records, searchTerm, dateFilter]);
  useEffect(() => {
    fetchMedicalRecords();
  }, [fetchMedicalRecords]);
  useEffect(() => {
    filterRecords();
  }, [filterRecords]);

  const handleViewRecord = async (record) => {
    // Optimistically show basic details, then fetch full populated record
    setSelectedRecord(record);
    setIsModalVisible(true);
    try {
      setDetailLoading(true);
      const res = await apiCall.get(`/medical-record/${record._id}`);
      if (res?.success && res?.medicalRecord) {
        setSelectedRecord(res.medicalRecord);
      }
    } catch (e) {
      // Keep the basic record; toast is optional to avoid noise
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadRecord = async (recordId) => {
    try {
      const blob = await apiCall.get(`/medical-record/${recordId}/download`, { responseType: 'blob' });
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-record-${recordId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Medical record download started');
      } else {
        toast.error('Failed to download medical record');
      }
    } catch (error) {
      console.error('Error downloading record:', error);
      toast.error('Failed to download record');
    }
  };

  const handleFileUpload = (event, recordId) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      setUploadRecordId(recordId);
      setIsUploadModalVisible(true);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !uploadRecordId) return;
    try {
      const fakeUrl = `https://fake-storage.com/${uploadFile.name}`;
      const payload = {
        filename: uploadFile.name,
        url: fakeUrl,
        type: uploadFile.type.startsWith('image') ? 'image' : 'document'
      };
      await apiCall.post(`/medical-record/${uploadRecordId}/attachment`, payload);
      toast.success('File uploaded and attached to record');
      setIsUploadModalVisible(false);
      setUploadFile(null);
      setUploadRecordId(null);
      fetchMedicalRecords();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const statCards = [
    {
      label: 'Total Records',
      value: stats.totalRecords,
      icon: <FileTextOutlined />,
      color: '#1d4ed8',
    },
    {
      label: 'Recent Records',
      value: stats.recentRecords,
      icon: <CalendarOutlined />,
      color: '#10b981'
    },
    {
      label: 'Prescriptions',
      value: stats.totalPrescriptions,
      icon: <MedicineBoxOutlined />,
      color: '#f57c00'
    },
    {
      label: 'Unique Diagnoses',
      value: stats.totalDiagnoses,
      icon: <UserOutlined />,
      color: '#8b5cf6'
    }
  ];
  return (
    <div className="patientRecords_page">
      <NavbarWrapper />
      {loading ? (
        <Loading />
      ) : (
        <div className="patientRecords_container">
          <PageHeader
            title="My Medical Records"
            subtitle="Access and manage your medical history, prescriptions, and health documents"
            className="patientRecords_header"
          />
          <div className="patientRecords_statsGrid">
            {statCards.map((card, idx) => (
            <div
                key={idx}
                className="patientRecords_statCard"
                style={{ borderLeftColor: card.color, cursor: 'pointer' }}
              >
                <div
                  className="patientRecords_statIcon"
                  style={{
                    backgroundColor: card.color,
                  }}
                >
                  {card.icon}
                </div>
                <div className="patientRecords_statContent">
                  <h3 className="patientRecords_statNumber">{card.value}</h3>
                  <p className="patientRecords_statLabel">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="patientRecords_controls">
            <div className="patientRecords_searchGroup">
              <div className="patientRecords_searchContainer">
                <input
                  type="text"
                  className="patientRecords_searchInput"
                  placeholder="Search records by diagnosis, symptoms, or doctor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="patientRecords_filterSelect"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>
            
            <div className="patientRecords_actionButtons">
              <input
                type="file"
                id="patientRecords_fileInput"
                className="patientRecords_fileInput"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="patientRecords_fileInput" className="patientRecords_uploadBtn">
                <UploadOutlined className="patientRecords_btnIcon" />
                Upload Record
              </label>
            </div>
          </div>

          {filteredRecords.length > 0 ? (
            <div className="patientRecords_content">
              <div className="patientRecords_grid">
                {filteredRecords.map((record) => (
                  <div key={record._id} className="patientRecords_card">
                    <div className="patientRecords_cardHeader">
                      <div className="patientRecords_cardTitle">
                        <FileTextOutlined className="patientRecords_cardIcon" />
                        <h3 className="patientRecords_cardHeading">
                          {(() => {
                            const dxArr = getDiagnosisArray(record.diagnosis);
                            return dxArr[0] || record.chiefComplaint || 'Medical Record';
                          })()}
                        </h3>
                      </div>
                      <div className="patientRecords_cardActions">
                        <button
                          className="patientRecords_actionBtn patientRecords_actionBtn--view"
                          onClick={() => handleViewRecord(record)}
                        >
                          <EyeOutlined />
                        </button>
                        <button
                          className="patientRecords_actionBtn patientRecords_actionBtn--download"
                          onClick={() => handleDownloadRecord(record._id)}
                        >
                          <DownloadOutlined />
                        </button>
                        <label className="patientRecords_actionBtn patientRecords_actionBtn--upload">
                          <UploadOutlined />
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={e => handleFileUpload(e, record._id)}
                          />
                        </label>
                      </div>
                    </div>
                    
                    <div className="patientRecords_cardBody">
                      <div className="patientRecords_cardInfo">
                        <p className="patientRecords_cardDate">
                          <CalendarOutlined className="patientRecords_infoIcon" />
                          {formatDate(record.visitDate || record.createdAt)}
                        </p>
                        {record.doctorId && (
                          <p className="patientRecords_cardDoctor">
                            <UserOutlined className="patientRecords_infoIcon" />
                            Dr. {record.doctorId.firstname} {record.doctorId.lastname}
                          </p>
                        )}
                      </div>
                      
                      <div className="patientRecords_cardDetails">
                        <span className="patientRecords_cardSymptoms">
                          <strong>Summary:</strong> {record.symptoms || record.chiefComplaint || 'No information recorded'}
                        </span>
                        {record.prescriptionIds && record.prescriptionIds.length > 0 && (
                          <div className="patientRecords_prescriptions">
                            <strong>Prescriptions:</strong>
                            <div className="patientRecords_prescriptionTags">
                              {(() => {
                                const rx = Array.isArray(record.prescriptionIds) ? record.prescriptionIds : [];
                                const withMeds = rx.filter(p => Array.isArray(p?.medications) && p.medications.length > 0);
                                return withMeds.slice(0, 2).map((p, index) => {
                                  const med = p.medications[0] || {};
                                  const label = [med.name, med.dosage].filter(Boolean).join(' ');
                                  return (
                                    <span key={index} className="patientRecords_prescriptionTag">
                                      {label || `Prescription #${index + 1}`}
                                    </span>
                                  );
                                });
                              })()}
                              {Array.isArray(record.prescriptionIds) && record.prescriptionIds.length > 2 && (
                                <span className="patientRecords_prescriptionTag patientRecords_prescriptionTag--more">
                                  +{record.prescriptionIds.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="patientRecords_empty">
              <Empty message="No medical records found. Your medical history will appear here." />
            </div>
          )}
        </div>
      )}

      {isModalVisible && selectedRecord && (
        <div className="patientRecords_modal patientRecords_modal--visible">
          <div className="patientRecords_modalContent">
            <div className="patientRecords_modalHeader">
              <h3 className="patientRecords_modalTitle">Medical Record Details {detailLoading ? '· Loading…' : ''}</h3>
              <button
                className="patientRecords_closeBtn"
                onClick={() => setIsModalVisible(false)}
              >
                ×
              </button>
            </div>
            
            <div className="patientRecords_modalBody">
              <div className="patientRecords_recordDetails">
                <div className="patientRecords_detailSection">
                  <h4 className="patientRecords_sectionTitle">General Information</h4>
                  <div className="patientRecords_detailGrid">
                    <div className="patientRecords_detailItem">
                      <label>Diagnosis:</label>
                      <div className="patientRecords_badgeList">
                        {(() => {
                          const dxArr = getDiagnosisArray(selectedRecord.diagnosis);
                          return dxArr.length > 0 ? (
                            dxArr.map((dx, i) => (
                              <span key={i} className="patientRecords_badge">{dx}</span>
                            ))
                          ) : (
                            <span className="patientRecords_muted">No diagnosis recorded</span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="patientRecords_detailItem">
                      <label>Date:</label>
                      <span>{formatDate(selectedRecord.visitDate || selectedRecord.createdAt)}</span>
                    </div>
                    {selectedRecord.doctorId && (
                      <div className="patientRecords_detailItem">
                        <label>Doctor:</label>
                        <span>Dr. {selectedRecord.doctorId.firstname} {selectedRecord.doctorId.lastname}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="patientRecords_detailSection">
                  <h4 className="patientRecords_sectionTitle">Clinical Summary</h4>
                  <div className="patientRecords_detailText">
                    {selectedRecord.symptoms && (
                      <div><strong>Symptoms:</strong> {selectedRecord.symptoms}</div>
                    )}
                    {selectedRecord.chiefComplaint && (
                      <div><strong>Chief Complaint:</strong> {selectedRecord.chiefComplaint}</div>
                    )}
                    {!selectedRecord.symptoms && !selectedRecord.chiefComplaint && (
                      <span className="patientRecords_muted">No clinical summary provided</span>
                    )}
                  </div>
                </div>
                
                <div className="patientRecords_detailSection">
                  <h4 className="patientRecords_sectionTitle">Treatment</h4>
                  <span className="patientRecords_detailText patientRecords_textWrap">{selectedRecord.treatment || 'No treatment recorded'}</span>
                </div>
                
                <div className="patientRecords_detailSection">
                  <h4 className="patientRecords_sectionTitle">Prescriptions</h4>
                  {(() => {
                    const rx = Array.isArray(selectedRecord.prescriptionIds) ? selectedRecord.prescriptionIds : [];
                    const withMeds = rx.filter(p => Array.isArray(p?.medications) && p.medications.length > 0);
                    if (withMeds.length === 0) {
                      return <span className="patientRecords_muted">No prescriptions recorded</span>;
                    }
                    return (
                      <div className="patientRecords_prescriptionList">
                        {withMeds.map((p, idx) => (
                          <div key={p._id || idx} className="patientRecords_prescriptionItem">
                            <div className="patientRecords_prescriptionDetails">
                              <span className="patientRecords_medicationName">Prescription {idx + 1}</span>
                              <div>
                                {(p.medications || []).map((m, mi) => (
                                  <div key={mi}>
                                    <strong>{[m.name, m.dosage].filter(Boolean).join(' ')}</strong>
                                    {m.frequency ? ` · ${m.frequency}` : ''}
                                    {m.duration ? ` · ${m.duration}` : ''}
                                    {m.quantity ? ` · #${m.quantity}` : ''}
                                    {m.instructions ? (
                                      <div className="patientRecords_muted">{m.instructions}</div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="patientRecords_detailSection">
                  <h4 className="patientRecords_sectionTitle">Assessment</h4>
                  <span className="patientRecords_detailText patientRecords_textWrap">{selectedRecord.assessment || 'No assessment provided'}</span>
                </div>

                {selectedRecord.physicalExamination && (
                  <div className="patientRecords_detailSection">
                    <h4 className="patientRecords_sectionTitle">Physical Examination</h4>
                    <div className="patientRecords_detailGrid">
                      {Object.entries(selectedRecord.physicalExamination).filter(([,v]) => v).map(([k, v]) => (
                        <div key={k} className="patientRecords_detailItem">
                          <label>{k.charAt(0).toUpperCase() + k.slice(1)}:</label>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(selectedRecord.healthMetricsIds) && selectedRecord.healthMetricsIds.length > 0 && (
                  <div className="patientRecords_detailSection">
                    <h4 className="patientRecords_sectionTitle">Vitals & Metrics</h4>
                    <div className="patientRecords_detailGrid">
                      {(() => {
                        const hm = selectedRecord.healthMetricsIds[0];
                        const rows = [];
                        if (hm?.weight) rows.push(['Weight', `${hm.weight} kg`]);
                        if (hm?.height) rows.push(['Height', `${hm.height} cm`]);
                        if (hm?.bmi) rows.push(['BMI', `${hm.bmi}${hm.bmiCategory ? ` (${hm.bmiCategory})` : ''}`]);
                        if (hm?.bloodPressure?.formatted || (hm?.bloodPressure?.systolic && hm?.bloodPressure?.diastolic)) {
                          const bp = hm.bloodPressure.formatted || `${hm.bloodPressure.systolic}/${hm.bloodPressure.diastolic}`;
                          rows.push(['Blood Pressure', `${bp}${hm.bloodPressureCategory ? ` (${hm.bloodPressureCategory})` : ''}`]);
                        }
                        if (hm?.heartRate) rows.push(['Heart Rate', `${hm.heartRate} bpm`]);
                        if (hm?.temperature?.value) rows.push(['Temperature', `${hm.temperature.value}° ${hm.temperature.unit === 'fahrenheit' ? 'F' : 'C'}`]);
                        if (hm?.oxygenSaturation) rows.push(['SpO2', `${hm.oxygenSaturation}%`]);
                        if (hm?.respiratoryRate) rows.push(['Respiratory Rate', `${hm.respiratoryRate}/min`]);
                        return rows.map(([label, val]) => (
                          <div key={label} className="patientRecords_detailItem">
                            <label>{label}:</label>
                            <span>{val}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {(selectedRecord.followUp_required || selectedRecord.followUp_timeframe || selectedRecord.followUp_instructions) && (
                  <div className="patientRecords_detailSection">
                    <h4 className="patientRecords_sectionTitle">Follow-up</h4>
                    <div className="patientRecords_detailGrid">
                      {selectedRecord.followUp_required !== undefined && (
                        <div className="patientRecords_detailItem"><label>Required:</label><span>{selectedRecord.followUp_required ? 'Yes' : 'No'}</span></div>
                      )}
                      {selectedRecord.followUp_timeframe && (
                        <div className="patientRecords_detailItem"><label>Timeframe:</label><span>{selectedRecord.followUp_timeframe}</span></div>
                      )}
                      {selectedRecord.followUp_instructions && (
                        <div className="patientRecords_detailItem"><label>Instructions:</label><span className="patientRecords_textWrap">{selectedRecord.followUp_instructions}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {Array.isArray(selectedRecord.attachments) && selectedRecord.attachments.length > 0 && (
                  <div className="patientRecords_detailSection">
                    <h4 className="patientRecords_sectionTitle">Attachments</h4>
                    <div className="patientRecords_detailGrid">
                      {selectedRecord.attachments.map((a, i) => (
                        <div key={i} className="patientRecords_detailItem">
                          <label>{a.type ? a.type.replace('_', ' ') : 'Document'}:</label>
                          <span>
                            <a href={a.url} target="_blank" rel="noreferrer">{a.filename || a.url}</a>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecord.notes && (
                  <div className="patientRecords_detailSection">
                    <h4 className="patientRecords_sectionTitle">Additional Notes</h4>
                    <span className="patientRecords_detailText">{selectedRecord.notes}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="patientRecords_modalFooter">
              <button
                className="patientRecords_modalBtn patientRecords_modalBtn--primary"
                onClick={() => handleDownloadRecord(selectedRecord._id)}
              >
                <DownloadOutlined className="patientRecords_btnIcon" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalVisible && (
        <div className="patientRecords_modal patientRecords_modal--visible">
          <div className="patientRecords_modalContent patientRecords_modalContent--small">
            <div className="patientRecords_modalHeader">
              <h3 className="patientRecords_modalTitle">Upload Medical Record</h3>
              <button
                className="patientRecords_closeBtn"
                onClick={() => setIsUploadModalVisible(false)}
              >
                ×
              </button>
            </div>
            
            <div className="patientRecords_modalBody">
              <div className="patientRecords_uploadInfo">
                <p><strong>Selected File:</strong> {uploadFile?.name}</p>
                <p><strong>Size:</strong> {uploadFile ? (uploadFile.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
              </div>
            </div>
            
            <div className="patientRecords_modalFooter">
              <button
                className="patientRecords_modalBtn patientRecords_modalBtn--secondary"
                onClick={() => {
                  setIsUploadModalVisible(false);
                  setUploadFile(null);
                  setUploadRecordId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="patientRecords_modalBtn patientRecords_modalBtn--primary"
                onClick={handleUploadSubmit}
              >
                <UploadOutlined className="patientRecords_btnIcon" />
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default PatientRecords;
