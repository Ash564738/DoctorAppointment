import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  SearchOutlined, 
  UserOutlined, 
  EyeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined
} from '../../../components/Common/Icons/Icons';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import Loading from '../../../components/Common/Loading/Loading';
import Empty from '../../../components/Common/Empty/Empty';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import './PatientRecords.css';

const PatientRecords = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
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

  const { userInfo } = useSelector((state) => state.root);

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, dateFilter, records]);

  const fetchMedicalRecords = async () => {
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
  };

  const calculateStats = (recordsData) => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    const recentRecords = recordsData.filter(record => 
      new Date(record.createdAt) >= oneMonthAgo
    ).length;
    
    const totalPrescriptions = recordsData.reduce((total, record) => 
      total + (record.prescriptions ? record.prescriptions.length : 0), 0
    );
    
    const uniqueDiagnoses = new Set(recordsData.map(record => record.diagnosis)).size;
    
    setStats({
      totalRecords: recordsData.length,
      recentRecords,
      totalPrescriptions,
      totalDiagnoses: uniqueDiagnoses
    });
  };

  const filterRecords = () => {
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
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setIsModalVisible(true);
  };

  const handleDownloadRecord = async (recordId) => {
    try {
      toast.success('Download functionality would be implemented here');
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

  return (
    <div className="patientRecords_page">
      <NavbarWrapper />
      {loading ? (
        <Loading />
      ) : (
        <div className="patientRecords_container">
          <div className="patientRecords_header">
            <h2 className="patientRecords_title">My Medical Records</h2>
            <p className="patientRecords_subtitle">
              Access and manage your medical history, prescriptions, and health documents
            </p>
          </div>

          <div className="patientRecords_statsGrid">
            <div className="patientRecords_statCard patientRecords_statCard--total">
              <div className="patientRecords_statIcon">
                <FileTextOutlined />
              </div>
              <div className="patientRecords_statContent">
                <h3 className="patientRecords_statNumber">{stats.totalRecords}</h3>
                <p className="patientRecords_statLabel">Total Records</p>
              </div>
            </div>
            
            <div className="patientRecords_statCard patientRecords_statCard--recent">
              <div className="patientRecords_statIcon">
                <CalendarOutlined />
              </div>
              <div className="patientRecords_statContent">
                <h3 className="patientRecords_statNumber">{stats.recentRecords}</h3>
                <p className="patientRecords_statLabel">Recent (30 days)</p>
              </div>
            </div>
            
            <div className="patientRecords_statCard patientRecords_statCard--prescriptions">
              <div className="patientRecords_statIcon">
                <MedicineBoxOutlined />
              </div>
              <div className="patientRecords_statContent">
                <h3 className="patientRecords_statNumber">{stats.totalPrescriptions}</h3>
                <p className="patientRecords_statLabel">Prescriptions</p>
              </div>
            </div>
            
            <div className="patientRecords_statCard patientRecords_statCard--diagnoses">
              <div className="patientRecords_statIcon">
                <UserOutlined />
              </div>
              <div className="patientRecords_statContent">
                <h3 className="patientRecords_statNumber">{stats.totalDiagnoses}</h3>
                <p className="patientRecords_statLabel">Unique Diagnoses</p>
              </div>
            </div>
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
                          {record.diagnosis && record.diagnosis.length > 0 
                            ? record.diagnosis[0].description 
                            : record.chiefComplaint || 'Medical Record'
                          }
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
                          <strong>Symptoms:</strong> {record.chiefComplaint || record.symptoms || 'No symptoms recorded'}
                        </span>
                        {record.prescriptions && record.prescriptions.length > 0 && (
                          <div className="patientRecords_prescriptions">
                            <strong>Prescriptions:</strong>
                            <div className="patientRecords_prescriptionTags">
                              {record.prescriptions.slice(0, 2).map((prescription, index) => (
                                <span key={index} className="patientRecords_prescriptionTag">
                                  {prescription.medication || prescription.name || 'Medication'}
                                </span>
                              ))}
                              {record.prescriptions.length > 2 && (
                                <span className="patientRecords_prescriptionTag patientRecords_prescriptionTag--more">
                                  +{record.prescriptions.length - 2} more
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
              <h3 className="patientRecords_modalTitle">Medical Record Details</h3>
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
                      <span>
                        {selectedRecord.diagnosis && selectedRecord.diagnosis.length > 0
                          ? selectedRecord.diagnosis.map(d => d.description).join(', ')
                          : selectedRecord.chiefComplaint || 'No diagnosis recorded'
                        }
                      </span>
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
                  <h4 className="patientRecords_sectionTitle">Symptoms</h4>
                  <span className="patientRecords_detailText">{selectedRecord.chiefComplaint || selectedRecord.symptoms || 'No symptoms recorded'}</span>
                </div>
                
                <div className="patientRecords_detailSection">
                  <h4 className="patientRecords_sectionTitle">Treatment</h4>
                  <span className="patientRecords_detailText">{selectedRecord.treatment}</span>
                </div>
                
                {selectedRecord.prescriptions && selectedRecord.prescriptions.length > 0 && (
                  <div className="patientRecords_detailSection">
                    <h4 className="patientRecords_sectionTitle">Prescriptions</h4>
                    <div className="patientRecords_prescriptionList">
                      {selectedRecord.prescriptions.map((prescription, index) => (
                        <div key={index} className="patientRecords_prescriptionItem">
                          <div className="patientRecords_prescriptionDetails">
                            <span className="patientRecords_medicationName">
                              {prescription.medication || prescription.name || 'Medication'}
                            </span>
                            {prescription.dosage && (
                              <span className="patientRecords_dosage"> - {prescription.dosage}</span>
                            )}
                            {prescription.frequency && (
                              <span className="patientRecords_frequency"> ({prescription.frequency})</span>
                            )}
                            {prescription.duration && (
                              <span className="patientRecords_duration">, {prescription.duration}</span>
                            )}
                            {prescription.quantity && (
                              <span className="patientRecords_quantity">, Qty: {prescription.quantity}</span>
                            )}
                          </div>
                          {prescription.instructions && (
                              <div className="patientRecords_instructions">
                                <span className="patientRecords_medicationName">Instructions:</span> {prescription.instructions}
                              </div>
                            )}
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
