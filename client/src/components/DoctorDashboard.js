import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [editedData, setEditedData] = useState([]);

  useEffect(() => {
    fetchPendingPrescriptions();
  }, []);

  const fetchPendingPrescriptions = async () => {
    try {
      const response = await axios.get('/api/prescriptions/pending');
      setPendingPrescriptions(response.data);
    } catch (error) {
      console.error('Error fetching pending prescriptions:', error);
    }
  };

  const handleApprove = async (prescription) => {
    try {
      await axios.post(`/api/prescriptions/${prescription.id}/verify`, {
        action: 'approve',
        verifiedData: editedData.length > 0 ? editedData : prescription.extracted_data
      });
      alert('Prescription approved!');
      fetchPendingPrescriptions();
      setSelectedPrescription(null);
      setEditedData([]);
    } catch (error) {
      alert('Error approving prescription: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReject = async (prescriptionId) => {
    if (!window.confirm('Are you sure you want to reject this prescription?')) {
      return;
    }

    try {
      await axios.post(`/api/prescriptions/${prescriptionId}/verify`, {
        action: 'reject'
      });
      alert('Prescription rejected!');
      fetchPendingPrescriptions();
      setSelectedPrescription(null);
      setEditedData([]);
    } catch (error) {
      alert('Error rejecting prescription: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (prescription) => {
    setSelectedPrescription(prescription);
    setEditedData([...prescription.extracted_data]);
  };

  const handleEditChange = (index, field, value) => {
    const newData = [...editedData];
    newData[index][field] = value;
    setEditedData(newData);
  };

  const handleAddMedicine = () => {
    setEditedData([...editedData, {
      name: '',
      dosage: '',
      frequency: '',
      duration: ''
    }]);
  };

  const handleRemoveMedicine = (index) => {
    setEditedData(editedData.filter((_, i) => i !== index));
  };

  return (
    <div className="container">
      <h1>Doctor Dashboard</h1>
      <div className="card">
        <h2>Pending Prescriptions</h2>
        {pendingPrescriptions.length === 0 ? (
          <p>No pending prescriptions</p>
        ) : (
          <div className="prescription-list">
            {pendingPrescriptions.map(prescription => (
              <div key={prescription.id} className="prescription-item">
                <div className="prescription-header">
                  <span>Patient: <strong>{prescription.patient_name}</strong></span>
                  <span>Patient ID: {prescription.patient_user_id}</span>
                  <span>Confidence: {(prescription.confidence * 100).toFixed(1)}%</span>
                  <span>Date: {new Date(prescription.created_at).toLocaleDateString()}</span>
                </div>
                <img
                  src={`http://localhost:5000/uploads/${prescription.image_path}`}
                  alt="Prescription"
                  className="prescription-image"
                />
                <div className="extracted-data">
                  <h3>Extracted Medicines:</h3>
                  <ul>
                    {prescription.extracted_data.map((med, index) => (
                      <li key={index}>
                        <strong>{med.name}</strong> - {med.dosage} - {med.frequency} - {med.duration}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="prescription-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleEdit(prescription)}
                  >
                    Edit & Approve
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(prescription)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReject(prescription.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPrescription && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Prescription Data</h2>
              <span className="close" onClick={() => {
                setSelectedPrescription(null);
                setEditedData([]);
              }}>&times;</span>
            </div>
            <div className="edit-medicines">
              {editedData.map((med, index) => (
                <div key={index} className="medicine-edit-item">
                  <div className="form-group">
                    <label>Medicine Name</label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => handleEditChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Dosage</label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => handleEditChange(index, 'dosage', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Frequency</label>
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => handleEditChange(index, 'frequency', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => handleEditChange(index, 'duration', e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveMedicine(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button className="btn btn-secondary" onClick={handleAddMedicine}>
                Add Medicine
              </button>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-success"
                onClick={() => handleApprove(selectedPrescription)}
              >
                Approve with Changes
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedPrescription(null);
                  setEditedData([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

