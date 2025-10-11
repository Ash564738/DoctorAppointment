import React from 'react';

const FiltersBar = ({ doctors, selectedDoctor, onDoctorChange, selectedWeek, onWeekChange }) => {
  const shiftWeek = (delta) => {
    const d = new Date(selectedWeek);
    d.setDate(d.getDate() + delta);
    onWeekChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="doctorScheduling_filters">
      <div className="doctorScheduling_filterGroup">
        <label>Doctor</label>
        <select
          className="doctorScheduling_select"
          value={selectedDoctor}
          onChange={(e) => onDoctorChange(e.target.value)}
        >
          <option value="">All</option>
          {doctors.map((doc) => (
            <option key={doc._id} value={doc.userId?._id}>
              {doc.userId?.firstname && doc.userId?.lastname ? `Dr. ${doc.userId.firstname} ${doc.userId.lastname}` : doc._id}
            </option>
          ))}
        </select>
      </div>
      <div className="doctorScheduling_filterGroup">
        <label>Week</label>
        <div className="doctorScheduling_weekNav">
          <button className="doctorScheduling_navButton" onClick={() => shiftWeek(-7)}>◀</button>
          <span>{new Date(selectedWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <button className="doctorScheduling_navButton" onClick={() => shiftWeek(7)}>▶</button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
