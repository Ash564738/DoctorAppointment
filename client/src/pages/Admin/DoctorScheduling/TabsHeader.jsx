import React from 'react';

const TabsHeader = ({ activeTab, onChange }) => {
  return (
    <div className="doctorScheduling_sectionHeader">
      <div className="doctorScheduling_tabs">
        <button className={`doctorScheduling_tabButton${activeTab === 'schedule' ? ' active' : ''}`} onClick={() => onChange('schedule')}>Schedules</button>
        <button className={`doctorScheduling_tabButton${activeTab === 'leave' ? ' active' : ''}`} onClick={() => onChange('leave')}>Leave Requests</button>
        <button className={`doctorScheduling_tabButton${activeTab === 'overtime' ? ' active' : ''}`} onClick={() => onChange('overtime')}>Overtime Requests</button>
        <button className={`doctorScheduling_tabButton${activeTab === 'swap' ? ' active' : ''}`} onClick={() => onChange('swap')}>Shift Swap Requests</button>
        <button className={`doctorScheduling_tabButton${activeTab === 'shiftRequests' ? ' active' : ''}`} onClick={() => onChange('shiftRequests')}>Shift Requests</button>
      </div>
    </div>
  );
};

export default TabsHeader;
