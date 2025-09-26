import React from 'react';

const MedicalRecordForm = ({
  recordData,
  onInputChange,
  onPrescriptionChange,
  addPrescription,
  removePrescription,
  addArrayItem,
  removeArrayItem,
  loading,
  isEditing,
  handleSubmit,
  readOnly = false,
  onClose,
  patientName = ''
}) => {
  const disableProps = readOnly ? { disabled: true, readOnly: true } : {};

  return (
    <form onSubmit={handleSubmit} className="doctorRecords_medicalRecordForm">
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Chief Complaint</h4>
                <textarea
                  className="doctorRecords_textarea"
                  name="chiefComplaint"
                  value={recordData.chiefComplaint}
                  onChange={onInputChange}
                  placeholder="Primary reason for the visit"
                  required
                  rows="3"
                />
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Symptoms</h4>
                <textarea
                  className="doctorRecords_textarea"
                  name="symptoms"
                  value={recordData.symptoms}
                  onChange={onInputChange}
                  placeholder="Describe symptoms (required for prescriptions)"
                  required
                  rows="3"
                />
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Diagnosis</h4>
                <textarea
                  className="doctorRecords_textarea"
                  name="diagnosis"
                  value={recordData.diagnosis && recordData.diagnosis[0] ? recordData.diagnosis[0].description : ''}
                  onChange={onInputChange}
                  placeholder="Diagnosis for this visit (required, max 500 chars)"
                  required
                  rows="3"
                />
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">History</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">History of Present Illness</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="historyOfPresentIllness"
                    value={recordData.historyOfPresentIllness}
                    onChange={onInputChange}
                    placeholder="Detailed description of current illness"
                    rows="4"
                  />
                </div>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Past Medical History</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="pastMedicalHistory"
                    value={recordData.pastMedicalHistory}
                    onChange={onInputChange}
                    placeholder="Previous medical conditions, surgeries, hospitalizations"
                    rows="3"
                  />
                </div>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_checkboxLabel">
                    <input
                      className="doctorRecords_checkbox"
                      type="checkbox"
                      name="skipFamilyHistory"
                      checked={recordData.skipFamilyHistory}
                      onChange={onInputChange}
                    />
                    Skip Family History
                  </label>
                </div>
                {!recordData.skipFamilyHistory && (
                  <div className="doctorRecords_formGroup">
                    <label className="doctorRecords_label">Family History</label>
                    <textarea
                      className="doctorRecords_textarea"
                      name="familyHistory"
                      value={recordData.familyHistory}
                      onChange={onInputChange}
                      placeholder="Relevant family medical history"
                      rows="3"
                    />
                  </div>
                )}
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Vital Signs</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_checkboxLabel">
                    <input
                      className="doctorRecords_checkbox"
                      type="checkbox"
                      name="skipVitalSigns"
                      checked={recordData.skipVitalSigns}
                      onChange={onInputChange}
                    />
                    Skip Vital Signs (e.g., for non-medical procedures)
                  </label>
                </div>
                {!recordData.skipVitalSigns && (
                  <div className="doctorRecords_vitalsGrid">
                    {/* Blood Pressure */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Blood Pressure</label>
                      <div className="doctorRecords_bpInputs">
                        {(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          const bp = vitals && typeof vitals.bloodPressure === 'object' && vitals.bloodPressure !== null ? vitals.bloodPressure : {};
                          return (
                            <>
                              <input
                                className="doctorRecords_input"
                                type="number"
                                name="vitalSigns.bloodPressure.systolic"
                                value={typeof bp.systolic !== 'undefined' ? bp.systolic : ''}
                                onChange={onInputChange}
                                placeholder="Systolic"
                              />
                              <span className="doctorRecords_bpSeparator">/</span>
                              <input
                                className="doctorRecords_input"
                                type="number"
                                name="vitalSigns.bloodPressure.diastolic"
                                value={typeof bp.diastolic !== 'undefined' ? bp.diastolic : ''}
                                onChange={onInputChange}
                                placeholder="Diastolic"
                              />
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Heart Rate */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Heart Rate (bpm)</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        name="vitalSigns.heartRate"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          return typeof vitals.heartRate !== 'undefined' ? vitals.heartRate : '';
                        })()}
                        onChange={onInputChange}
                      />
                    </div>
                    {/* Temperature */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Temperature</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        step="0.1"
                        name="vitalSigns.temperature.value"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          const temp = vitals.temperature && typeof vitals.temperature === 'object' ? vitals.temperature : {};
                          return typeof temp.value !== 'undefined' ? temp.value : '';
                        })()}
                        onChange={onInputChange}
                        placeholder="Value"
                      />
                      <select
                        className="doctorRecords_input"
                        name="vitalSigns.temperature.unit"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          const temp = vitals.temperature && typeof vitals.temperature === 'object' ? vitals.temperature : {};
                          return temp.unit || 'celsius';
                        })()}
                        onChange={onInputChange}
                      >
                        <option value="celsius">Celsius</option>
                        <option value="fahrenheit">Fahrenheit</option>
                      </select>
                    </div>
                    {/* Blood Sugar */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Blood Sugar</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        step="0.1"
                        name="vitalSigns.bloodSugar.value"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          const bs = vitals.bloodSugar && typeof vitals.bloodSugar === 'object' ? vitals.bloodSugar : {};
                          return typeof bs.value !== 'undefined' ? bs.value : '';
                        })()}
                        onChange={onInputChange}
                        placeholder="Value"
                      />
                      <select
                        className="doctorRecords_input"
                        name="vitalSigns.bloodSugar.testType"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          const bs = vitals.bloodSugar && typeof vitals.bloodSugar === 'object' ? vitals.bloodSugar : {};
                          return bs.testType || '';
                        })()}
                        onChange={onInputChange}
                      >
                        <option value="">Test Type</option>
                        <option value="fasting">Fasting</option>
                        <option value="random">Random</option>
                        <option value="post_meal">Post Meal</option>
                        <option value="hba1c">HbA1c</option>
                      </select>
                      <select
                        className="doctorRecords_input"
                        name="vitalSigns.bloodSugar.unit"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          const bs = vitals.bloodSugar && typeof vitals.bloodSugar === 'object' ? vitals.bloodSugar : {};
                          return bs.unit || 'mg/dl';
                        })()}
                        onChange={onInputChange}
                      >
                        <option value="mg/dl">mg/dl</option>
                        <option value="mmol/l">mmol/l</option>
                      </select>
                    </div>
                    {/* Oxygen Saturation */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">O2 Saturation (%)</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        name="vitalSigns.oxygenSaturation"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          return typeof vitals.oxygenSaturation !== 'undefined' ? vitals.oxygenSaturation : '';
                        })()}
                        onChange={onInputChange}
                      />
                    </div>
                    {/* Respiratory Rate */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Respiratory Rate (breaths/min)</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        name="vitalSigns.respiratoryRate"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          return typeof vitals.respiratoryRate !== 'undefined' ? vitals.respiratoryRate : '';
                        })()}
                        onChange={onInputChange}
                      />
                    </div>
                    {/* Weight */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Weight (kg)</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        step="0.1"
                        name="vitalSigns.weight"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          return typeof vitals.weight !== 'undefined' ? vitals.weight : '';
                        })()}
                        onChange={onInputChange}
                      />
                    </div>
                    {/* Height */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Height (cm)</label>
                      <input
                        className="doctorRecords_input"
                        type="number"
                        name="vitalSigns.height"
                        value={(() => {
                          const vitals = recordData && typeof recordData.vitalSigns === 'object' && recordData.vitalSigns !== null ? recordData.vitalSigns : {};
                          return typeof vitals.height !== 'undefined' ? vitals.height : '';
                        })()}
                        onChange={onInputChange}
                      />
                    </div>
                    {/* Notes */}
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Notes</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="vitalSigns.notes"
                        value={recordData.vitalSigns && recordData.vitalSigns.notes ? recordData.vitalSigns.notes : ''}
                        onChange={onInputChange}
                        placeholder="Additional notes about health metrics"
                        rows="2"
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Physical Examination (optional) */}
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Physical Examination</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_checkboxLabel">
                    <input
                      className="doctorRecords_checkbox"
                      type="checkbox"
                      name="skipPhysicalExamination"
                      checked={recordData.skipPhysicalExamination}
                      onChange={onInputChange}
                    />
                    Skip Physical Examination (e.g., for plastic surgery)
                  </label>
                </div>
                {!recordData.skipPhysicalExamination && (
                  <>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">General</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.general"
                        value={recordData.physicalExamination.general}
                        onChange={onInputChange}
                        placeholder="General appearance, consciousness, etc."
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Head</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.head"
                        value={recordData.physicalExamination.head}
                        onChange={onInputChange}
                        placeholder="Head findings"
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Neck</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.neck"
                        value={recordData.physicalExamination.neck}
                        onChange={onInputChange}
                        placeholder="Neck findings"
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Chest</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.chest"
                        value={recordData.physicalExamination.chest}
                        onChange={onInputChange}
                        placeholder="Chest findings"
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Abdomen</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.abdomen"
                        value={recordData.physicalExamination.abdomen}
                        onChange={onInputChange}
                        placeholder="Abdomen findings"
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Extremities</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.extremities"
                        value={recordData.physicalExamination.extremities}
                        onChange={onInputChange}
                        placeholder="Extremities findings"
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Neurological</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.neurological"
                        value={recordData.physicalExamination.neurological}
                        onChange={onInputChange}
                        placeholder="Neurological findings"
                        rows="2"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Other</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="physicalExamination.other"
                        value={recordData.physicalExamination.other}
                        onChange={onInputChange}
                        placeholder="Other findings"
                        rows="2"
                      />
                    </div>
                  </>
                )}
              </div>
              {/* Assessment & Treatment */}
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Assessment & Treatment</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Assessment *</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="assessment"
                    value={recordData.assessment}
                    onChange={onInputChange}
                    placeholder="Clinical assessment and findings"
                    required
                    rows="4"
                  />
                </div>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_label">Treatment Plan</label>
                  <textarea
                    className="doctorRecords_textarea"
                    name="treatment"
                    value={recordData.treatment}
                    onChange={onInputChange}
                    placeholder="Treatment recommendations and plan"
                    rows="4"
                  />
                </div>
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Allergies</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_checkboxLabel">
                    <input
                      className="doctorRecords_checkbox"
                      type="checkbox"
                      name="skipAllergies"
                      checked={recordData.skipAllergies}
                      onChange={onInputChange}
                    />
                    No Known Allergies
                  </label>
                </div>
                {!recordData.skipAllergies && (
                  <div>
                    {(recordData.allergies || []).map((allergy, idx) => (
                      <div key={idx} className="doctorRecords_allergyCard">
                        <input
                          type="text"
                          className="doctorRecords_input"
                          placeholder="Allergen"
                          value={allergy.allergen}
                          onChange={e => addArrayItem('allergies', { ...recordData.allergies[idx], allergen: e.target.value })}
                        />
                        <input
                          type="text"
                          className="doctorRecords_input"
                          placeholder="Reaction"
                          value={allergy.reaction}
                          onChange={e => addArrayItem('allergies', { ...recordData.allergies[idx], reaction: e.target.value })}
                        />
                        <select
                          className="doctorRecords_input"
                          value={allergy.severity}
                          onChange={e => addArrayItem('allergies', { ...recordData.allergies[idx], severity: e.target.value })}
                        >
                          <option value="">Severity</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                        {recordData.allergies.length > 1 && (
                          <button type="button" onClick={() => removeArrayItem('allergies', idx)} className="doctorRecords_removeBtn">Remove</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addArrayItem('allergies', { allergen: '', reaction: '', severity: '' })} className="doctorRecords_addAllergyBtn">Add Allergy</button>
                  </div>
                )}
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Prescriptions</h4>
                <p className="doctorRecords_prescriptionsNote">
                  (Optional) Add one or more prescriptions for this visit. Leave empty if not needed.
                </p>
                {(recordData.prescriptions || []).map((presc, idx) => (
                  <div key={idx} className="doctorRecords_prescriptionCard">
                    <div className="doctorRecords_prescriptionHeader">
                      <span className="doctorRecords_prescriptionTitle">Prescription {idx+1}</span>
                      {recordData.prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrescription(idx)}
                          className="doctorRecords_removePrescriptionBtn"
                          aria-label="Remove prescription"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="doctorRecords_prescriptionFields">
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Medication name"
                        value={presc.medication}
                        onChange={e => onPrescriptionChange(idx, 'medication', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Dosage"
                        value={presc.dosage}
                        onChange={e => onPrescriptionChange(idx, 'dosage', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Frequency"
                        value={presc.frequency}
                        onChange={e => onPrescriptionChange(idx, 'frequency', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Duration"
                        value={presc.duration}
                        onChange={e => onPrescriptionChange(idx, 'duration', e.target.value)}
                        required={false}
                      />
                      <input
                        type="text"
                        className="doctorRecords_input"
                        placeholder="Quantity"
                        value={presc.quantity}
                        onChange={e => onPrescriptionChange(idx, 'quantity', e.target.value)}
                        required={false}
                      />
                      <textarea
                        className="doctorRecords_textarea"
                        placeholder="Instructions"
                        value={presc.instructions}
                        onChange={e => onPrescriptionChange(idx, 'instructions', e.target.value)}
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPrescription}
                  className="doctorRecords_addPrescriptionBtn"
                >
                  Add Another Prescription
                </button>
              </div>
              <div className="doctorRecords_formSection">
                <h4 className="doctorRecords_sectionHeading">Follow-up</h4>
                <div className="doctorRecords_formGroup">
                  <label className="doctorRecords_checkboxLabel">
                    <input
                      className="doctorRecords_checkbox"
                      type="checkbox"
                      name="followUp.required"
                      checked={recordData.followUp.required}
                      onChange={onInputChange}
                    />
                    Follow-up required
                  </label>
                </div>
                {recordData.followUp.required && (
                  <>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Follow-up Timeframe</label>
                      <input
                        className="doctorRecords_input"
                        type="text"
                        name="followUp.timeframe"
                        value={recordData.followUp.timeframe}
                        onChange={onInputChange}
                        placeholder="e.g., 1 week, 2 weeks, 1 month"
                      />
                    </div>
                    <div className="doctorRecords_formGroup">
                      <label className="doctorRecords_label">Follow-up Instructions</label>
                      <textarea
                        className="doctorRecords_textarea"
                        name="followUp.instructions"
                        value={recordData.followUp.instructions}
                        onChange={onInputChange}
                        placeholder="Instructions for follow-up visit"
                        rows="2"
                      />
                    </div>
                  </>
                )}
              </div>
  </form>
  );
};

export default MedicalRecordForm;