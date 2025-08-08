import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import './VideoConsultation.css';

const VideoConsultation = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.root.user);
  
  const [consultation, setConsultation] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescriptions: [],
    followUpRequired: false,
    followUpDate: ''
  });
  const [showNotes, setShowNotes] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    joinConsultation();
    initializeWebRTC();
    
    return () => {
      cleanup();
    };
  }, [meetingId]);

  const joinConsultation = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5015/api/video-consultation/join/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (response.data.success) {
        setConsultation(response.data.consultation);
        setIsJoined(true);
        setConnectionStatus('connected');
        toast.success('Successfully joined consultation');
      }
    } catch (error) {
      console.error('Error joining consultation:', error);
      toast.error(error.response?.data?.message || 'Failed to join consultation');
      navigate('/dashboard');
    }
  };

  const initializeWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        setConnectionStatus(peerConnection.connectionState);
      };

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast.error('Failed to access camera/microphone');
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Replace video track with screen share
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
        setIsScreenSharing(true);
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
      toast.error('Failed to start screen sharing');
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream again
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      const videoTrack = cameraStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
        setIsScreenSharing(false);
        
        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
        
        localStreamRef.current = cameraStream;
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const sendChatMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        sender: user.firstname,
        message: newMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // TODO: Send message through WebRTC data channel or Socket.IO
    }
  };

  const saveConsultationNotes = async () => {
    try {
      await axios.post(
        `http://localhost:5015/api/video-consultation/${consultation.id}/notes`,
        consultationNotes,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      toast.success('Consultation notes saved successfully');
      setShowNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save consultation notes');
    }
  };

  const endConsultation = async () => {
    try {
      await axios.post(
        `http://localhost:5015/api/video-consultation/end/${consultation.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      toast.success('Consultation ended successfully');
      cleanup();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending consultation:', error);
      toast.error('Failed to end consultation');
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const addPrescription = () => {
    setConsultationNotes(prev => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        { medication: '', dosage: '', frequency: '', duration: '', instructions: '' }
      ]
    }));
  };

  const removePrescription = (index) => {
    setConsultationNotes(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const updatePrescription = (index, field, value) => {
    setConsultationNotes(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((prescription, i) =>
        i === index ? { ...prescription, [field]: value } : prescription
      )
    }));
  };

  if (!isJoined) {
    return (
      <div className="video-consultation-loading">
        <div className="loading-spinner"></div>
        <p>Joining consultation...</p>
      </div>
    );
  }

  return (
    <div className="video-consultation-container">
      <div className="video-consultation-header">
        <h2>Video Consultation</h2>
        <div className="connection-status">
          <span className={`status-indicator ${connectionStatus}`}></span>
          <span>{connectionStatus}</span>
        </div>
        <div className="consultation-info">
          <span>Meeting ID: {meetingId}</span>
          <span>Duration: {consultation?.duration} mins</span>
        </div>
      </div>

      <div className="video-consultation-content">
        <div className="video-section">
          <div className="video-grid">
            <div className="video-container local-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="video-element"
              />
              <div className="video-overlay">
                <span>You</span>
                {!isCameraOn && <div className="camera-off-indicator">Camera Off</div>}
                {!isMicOn && <div className="mic-off-indicator">🔇</div>}
              </div>
            </div>
            
            <div className="video-container remote-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="video-element"
              />
              <div className="video-overlay">
                <span>{consultation?.participants?.patient?.firstname || consultation?.participants?.doctor?.firstname}</span>
              </div>
            </div>
          </div>

          <div className="video-controls">
            <button
              className={`control-btn ${isCameraOn ? 'active' : 'inactive'}`}
              onClick={toggleCamera}
              title="Toggle Camera"
            >
              📹
            </button>
            
            <button
              className={`control-btn ${isMicOn ? 'active' : 'inactive'}`}
              onClick={toggleMicrophone}
              title="Toggle Microphone"
            >
              🎤
            </button>
            
            <button
              className={`control-btn ${isScreenSharing ? 'active' : ''}`}
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              title="Screen Share"
            >
              🖥️
            </button>
            
            <button
              className="control-btn"
              onClick={() => setShowChat(!showChat)}
              title="Toggle Chat"
            >
              💬
            </button>
            
            {user.role === 'Doctor' && (
              <button
                className="control-btn"
                onClick={() => setShowNotes(!showNotes)}
                title="Consultation Notes"
              >
                📝
              </button>
            )}
            
            <button
              className="control-btn end-call"
              onClick={endConsultation}
              title="End Consultation"
            >
              📞
            </button>
          </div>
        </div>

        {showChat && (
          <div className="chat-section">
            <div className="chat-header">
              <h3>Chat</h3>
              <button onClick={() => setShowChat(false)}>✕</button>
            </div>
            
            <div className="chat-messages">
              {chatMessages.map(message => (
                <div key={message.id} className="chat-message">
                  <div className="message-header">
                    <span className="sender">{message.sender}</span>
                    <span className="timestamp">{message.timestamp}</span>
                  </div>
                  <div className="message-content">{message.message}</div>
                </div>
              ))}
            </div>
            
            <div className="chat-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              />
              <button onClick={sendChatMessage}>Send</button>
            </div>
          </div>
        )}

        {showNotes && user.role === 'Doctor' && (
          <div className="consultation-notes-section">
            <div className="notes-header">
              <h3>Consultation Notes</h3>
              <button onClick={() => setShowNotes(false)}>✕</button>
            </div>
            
            <div className="notes-content">
              <div className="form-group">
                <label>Symptoms:</label>
                <textarea
                  value={consultationNotes.symptoms}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="Patient symptoms and complaints..."
                />
              </div>
              
              <div className="form-group">
                <label>Diagnosis:</label>
                <textarea
                  value={consultationNotes.diagnosis}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Medical diagnosis..."
                />
              </div>
              
              <div className="form-group">
                <label>Treatment Plan:</label>
                <textarea
                  value={consultationNotes.treatment}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, treatment: e.target.value }))}
                  placeholder="Treatment recommendations..."
                />
              </div>
              
              <div className="prescriptions-section">
                <div className="prescriptions-header">
                  <label>Prescriptions:</label>
                  <button type="button" onClick={addPrescription} className="add-prescription-btn">
                    + Add Prescription
                  </button>
                </div>
                
                {consultationNotes.prescriptions.map((prescription, index) => (
                  <div key={index} className="prescription-item">
                    <div className="prescription-row">
                      <input
                        type="text"
                        placeholder="Medication"
                        value={prescription.medication}
                        onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={prescription.dosage}
                        onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={prescription.frequency}
                        onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={prescription.duration}
                        onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removePrescription(index)}
                        className="remove-prescription-btn"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      placeholder="Special instructions..."
                      value={prescription.instructions}
                      onChange={(e) => updatePrescription(index, 'instructions', e.target.value)}
                      className="prescription-instructions"
                    />
                  </div>
                ))}
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={consultationNotes.followUpRequired}
                    onChange={(e) => setConsultationNotes(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                  />
                  Follow-up required
                </label>
                
                {consultationNotes.followUpRequired && (
                  <input
                    type="date"
                    value={consultationNotes.followUpDate}
                    onChange={(e) => setConsultationNotes(prev => ({ ...prev, followUpDate: e.target.value }))}
                  />
                )}
              </div>
              
              <div className="notes-actions">
                <button onClick={saveConsultationNotes} className="save-notes-btn">
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoConsultation;
