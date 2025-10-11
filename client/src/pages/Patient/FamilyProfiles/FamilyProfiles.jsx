import React, { useState, useEffect } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import './FamilyProfiles.css';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';

const FamilyProfiles = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relation: '',
    dateOfBirth: '',
    bloodGroup: '',
    medicalConditions: '',
    emergencyContact: ''
  });

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/family-members');
      if (response && response.success) {
        const list = response.data?.familyMembers || [];
        setFamilyMembers(list);
      } else {
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Map UI form to backend model
      const [firstname, ...rest] = (formData.name || '').trim().split(/\s+/);
      const lastname = rest.join(' ');
      const relMap = {
        spouse: 'spouse', husband: 'spouse', wife: 'spouse',
        son: 'child', daughter: 'child', child: 'child',
        father: 'parent', mother: 'parent', parent: 'parent',
        brother: 'sibling', sister: 'sibling', sibling: 'sibling',
        grandfather: 'grandparent', grandmother: 'grandparent', grandparent: 'grandparent',
        grandson: 'grandchild', granddaughter: 'grandchild', grandchild: 'grandchild'
      };
      const relationship = relMap[(formData.relation || '').toLowerCase()] || (formData.relation || 'other').toLowerCase();
      const payload = {
        firstname: firstname || formData.name,
        lastname: lastname || '',
        relationship,
        dateOfBirth: formData.dateOfBirth || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        // Store simple conditions/contacts in appropriate arrays if provided
        ...(formData.medicalConditions ? { medicalHistory: [{ condition: formData.medicalConditions }] } : {}),
        ...(formData.emergencyContact ? { emergencyContacts: [{ phone: formData.emergencyContact, isPrimary: true }] } : {})
      };

      if (editingMember) {
        await apiCall.put(`/family-members/${editingMember._id}`, payload);
        toast.success('Family member updated successfully');
      } else {
        await apiCall.post('/family-members', payload);
        toast.success('Family member added successfully');
      }
      setShowAddModal(false);
      setEditingMember(null);
      setFormData({
        name: '',
        relation: '',
        dateOfBirth: '',
        bloodGroup: '',
        medicalConditions: '',
        emergencyContact: ''
      });
      fetchFamilyMembers();
    } catch (error) {
      toast.error(editingMember ? 'Failed to update family member' : 'Failed to add family member');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      relation: member.relation || '',
      dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
      bloodGroup: member.bloodGroup || '',
      medicalConditions: member.medicalConditions || '',
      emergencyContact: member.emergencyContact || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this family member?')) {
      try {
        await apiCall.delete(`/family-members/${memberId}`);
        toast.success('Family member deleted successfully');
        fetchFamilyMembers();
      } catch (error) {
        toast.error('Failed to delete family member');
      }
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="familyProfiles_page">
      <NavbarWrapper />
        <div className="familyProfiles_container">
          <PageHeader
            title="Family Profiles"
            subtitle="Manage your family members and their medical information for easy appointment booking."
            className="familyProfiles_header"
            actions={(
              <button
                className="familyProfiles_addButton"
                onClick={() => setShowAddModal(true)}
              >
                Add Family Member
              </button>
            )}
          />

          {loading ? (
            <div className="familyProfiles_loading">
              <div className="familyProfiles_spinner"></div>
              <p className="familyProfiles_loadingText">Loading family members...</p>
            </div>
          ) : (
            <div className="familyProfiles_grid">
              {familyMembers.map((member) => (
                <div key={member._id} className="familyProfiles_card">
                  <div className="familyProfiles_cardHeader">
                    <h3 className="familyProfiles_memberName">{member.fullName || `${member.firstname || ''} ${member.lastname || ''}`.trim()}</h3>
                    <span className="familyProfiles_relation">{(member.relationship || 'Other').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  </div>
                  <div className="familyProfiles_cardBody">
                    <div className="familyProfiles_info">
                      <span className="familyProfiles_label">Age:</span>
                      <span className="familyProfiles_value">{calculateAge(member.dateOfBirth)} years</span>
                    </div>
                    <div className="familyProfiles_info">
                      <span className="familyProfiles_label">Blood Group:</span>
                      <span className="familyProfiles_value">{member.bloodGroup || 'Not specified'}</span>
                    </div>
                    <div className="familyProfiles_info">
                      <span className="familyProfiles_label">Medical Conditions:</span>
                      <span className="familyProfiles_value">{Array.isArray(member.medicalHistory) && member.medicalHistory.length > 0 ? (member.medicalHistory.map(m => m.condition).join(', ')) : 'None'}</span>
                    </div>
                    <div className="familyProfiles_info">
                      <span className="familyProfiles_label">Emergency Contact:</span>
                      <span className="familyProfiles_value">{Array.isArray(member.emergencyContacts) && member.emergencyContacts[0]?.phone ? member.emergencyContacts[0].phone : 'Not provided'}</span>
                    </div>
                  </div>
                  <div className="familyProfiles_cardActions">
                    <button 
                      className="familyProfiles_editButton"
                      onClick={() => handleEdit(member)}
                    >
                      Edit
                    </button>
                    <button 
                      className="familyProfiles_deleteButton"
                      onClick={() => handleDelete(member._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {familyMembers.length === 0 && (
                <div className="familyProfiles_emptyState">
                  <h3 className="familyProfiles_emptyTitle">No Family Members Added</h3>
                  <p className="familyProfiles_emptyDescription">
                    Add your family members to easily book appointments for them.
                  </p>
                  <button 
                    className="familyProfiles_addFirstButton"
                    onClick={() => setShowAddModal(true)}
                  >
                    Add First Family Member
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Add/Edit Modal */}
          {showAddModal && (
            <div className="familyProfiles_modal">
              <div className="familyProfiles_modalContent">
                <div className="familyProfiles_modalHeader">
                  <h2 className="familyProfiles_modalTitle">
                    {editingMember ? 'Edit Family Member' : 'Add New Family Member'}
                  </h2>
                  <button 
                    className="familyProfiles_closeButton"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingMember(null);
                      setFormData({
                        name: '',
                        relation: '',
                        dateOfBirth: '',
                        bloodGroup: '',
                        medicalConditions: '',
                        emergencyContact: ''
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
                <form className="familyProfiles_form" onSubmit={handleSubmit}>
                  <div className="familyProfiles_formGroup">
                    <label className="familyProfiles_label">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="familyProfiles_input"
                      required
                    />
                  </div>
                  <div className="familyProfiles_formGroup">
                    <label className="familyProfiles_label">Relation</label>
                    <select
                      name="relation"
                      value={formData.relation}
                      onChange={handleInputChange}
                      className="familyProfiles_input"
                      required
                    >
                      <option value="">Select Relation</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Grandfather">Grandfather</option>
                      <option value="Grandmother">Grandmother</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="familyProfiles_formGroup">
                    <label className="familyProfiles_label">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="familyProfiles_input"
                      required
                    />
                  </div>
                  <div className="familyProfiles_formGroup">
                    <label className="familyProfiles_label">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleInputChange}
                      className="familyProfiles_input"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="familyProfiles_formGroup">
                    <label className="familyProfiles_label">Medical Conditions</label>
                    <textarea
                      name="medicalConditions"
                      value={formData.medicalConditions}
                      onChange={handleInputChange}
                      className="familyProfiles_textarea"
                      placeholder="Any known medical conditions, allergies, or chronic illnesses"
                      rows="3"
                    />
                  </div>
                  <div className="familyProfiles_formGroup">
                    <label className="familyProfiles_label">Emergency Contact</label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      className="familyProfiles_input"
                      placeholder="Emergency contact number"
                    />
                  </div>
                  <div className="familyProfiles_formActions">
                    <button 
                      type="button" 
                      className="familyProfiles_cancelButton"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingMember(null);
                        setFormData({
                          name: '',
                          relation: '',
                          dateOfBirth: '',
                          bloodGroup: '',
                          medicalConditions: '',
                          emergencyContact: ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="familyProfiles_saveButton">
                      {editingMember ? 'Update' : 'Add'} Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      <Footer />
    </div>
  );
};

export default FamilyProfiles;
