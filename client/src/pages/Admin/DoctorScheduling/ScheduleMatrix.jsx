import React, { useMemo } from 'react';
import { formatRange, formatShortDate, formatTime, mergeSegmentsForDisplay } from './schedulingUtils';

const ScheduleMatrix = ({ doctors, leaveRequests = [], overtimeRequests = [], swapRequests = [], weekDays, schedules, onDeleteSchedule }) => {
  const toLocalKey = (dt) => {
    const t = new Date(dt);
    const y = t.getFullYear();
    const m = String(t.getMonth()+1).padStart(2,'0');
    const d = String(t.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };

  const getScheduleForDay = (date, doctorId) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (!Array.isArray(schedules)) return [];
    return schedules.filter(s => s.date === dateStr && (!doctorId || s.doctorId === doctorId));
  };

  const isOnLeave = (doctorUserId, date) => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0,0,0,0);
    return (leaveRequests || []).some(lr => {
      if (lr.status !== 'approved') return false;
      const lrDocId = lr.doctorId?._id || lr.doctorId;
      if (lrDocId !== doctorUserId) return false;
      const s = new Date(lr.startDate); s.setHours(0,0,0,0);
      const e = new Date(lr.endDate); e.setHours(23,59,59,999);
      return dateOnly >= s && dateOnly <= e;
    });
  };

  const hasOvertime = (doctorUserId, date) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    return (overtimeRequests || []).some(ot => {
      if (ot.status !== 'approved') return false;
      const otDocId = ot.doctorId?._id || ot.doctorId;
      if (otDocId !== doctorUserId) return false;
      const d = new Date(ot.date).toISOString().split('T')[0];
      return d === dateStr;
    });
  };

  const getSwapInfo = (doctorUserId, date) => {
    const dOnly = new Date(date); dOnly.setHours(0,0,0,0);
    const matches = (swapRequests || []).filter(sw => {
      if (sw.status !== 'approved') return false;
      const involvedIds = [sw.requesterId?._id || sw.requesterId, sw.swapWithId?._id || sw.swapWithId];
      if (!involvedIds.includes(doctorUserId)) return false;
      if (sw.swapDate) {
        const sd = new Date(sw.swapDate); sd.setHours(0,0,0,0);
        return sd.getTime() === dOnly.getTime();
      }
      if (sw.swapStartDate && sw.swapEndDate) {
        const s = new Date(sw.swapStartDate); s.setHours(0,0,0,0);
        const e = new Date(sw.swapEndDate); e.setHours(0,0,0,0);
        return dOnly >= s && dOnly <= e;
      }
      return false;
    });
    if (matches.length === 0) return null;
    const sw = matches[0];
    const other = (sw.requesterId?._id || sw.requesterId) === doctorUserId ? sw.swapWithId : sw.requesterId;
    const otherName = other?.firstname ? `Dr. ${other.firstname} ${other.lastname}` : 'colleague';
    const rangeText = sw.swapDate
      ? `on ${formatShortDate(sw.swapDate)}`
      : (sw.swapStartDate && sw.swapEndDate ? formatRange(sw.swapStartDate, sw.swapEndDate) : '');
    const extra = matches.length > 1 ? ` (+${matches.length - 1} more)` : '';
    return { text: `Swap with ${otherName} ${rangeText}${extra}`.trim() };
  };

  return (
    <div className="doctorScheduling_matrix">
      <div className="doctorScheduling_matrixScroll">
        <div className="doctorScheduling_matrixHead">
          <div className="doctorScheduling_matrixHeadDoctor">Doctor</div>
          {weekDays.map((day, index) => (
            <div key={index} className="doctorScheduling_matrixHeadDay">
              <div className="doctorScheduling_dayName">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="doctorScheduling_dayDate">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          ))}
        </div>
        <div className="doctorScheduling_matrixBody">
          {(doctors || []).map((doc) => {
            const docLabel = doc.userId?.firstname && doc.userId?.lastname
              ? `Dr. ${doc.userId.firstname} ${doc.userId.lastname}`
              : doc._id;
            return (
              <div key={doc._id} className="doctorScheduling_matrixRow">
                <div className="doctorScheduling_matrixDoctorCell">
                  <div className="doctorScheduling_doctorLabel">{docLabel}</div>
                  {doc.department ? <div className="doctorScheduling_doctorDept">{doc.department}</div> : null}
                </div>
                {weekDays.map((day, idx) => {
                  const docUserId = doc.userId?._id;
                  const itemsRaw = getScheduleForDay(day, docUserId);
                  const items = mergeSegmentsForDisplay(itemsRaw);
                  const leaveBadge = isOnLeave(docUserId, day);
                  const leaveDetail = (() => {
                    if (!leaveBadge) return null;
                    const lr = (leaveRequests || []).find(lr => {
                      if (lr.status !== 'approved') return false;
                      const lrDocId = lr.doctorId?._id || lr.doctorId;
                      if (lrDocId !== docUserId) return false;
                      const d0 = new Date(day); d0.setHours(0,0,0,0);
                      const s = new Date(lr.startDate); s.setHours(0,0,0,0);
                      const e = new Date(lr.endDate); e.setHours(0,0,0,0);
                      return d0 >= s && d0 <= e;
                    });
                    if (!lr) return null;
                    const reason = (lr.reason || '').trim();
                    const type = lr.leaveType || 'Leave';
                    const range = formatRange(lr.startDate, lr.endDate);
                    return `${type} ${range}${reason ? ` — ${reason}` : ''}`;
                  })();
                  const leaveInline = (() => {
                    if (!leaveBadge) return null;
                    const lr = (leaveRequests || []).find(lr => {
                      if (lr.status !== 'approved') return false;
                      const lrDocId = lr.doctorId?._id || lr.doctorId;
                      if (lrDocId !== docUserId) return false;
                      const d0 = new Date(day); d0.setHours(0,0,0,0);
                      const s = new Date(lr.startDate); s.setHours(0,0,0,0);
                      const e = new Date(lr.endDate); e.setHours(0,0,0,0);
                      return d0 >= s && d0 <= e;
                    });
                    if (!lr) return null;
                    const reason = (lr.reason || '').trim();
                    const type = lr.leaveType ? ` (${lr.leaveType})` : '';
                    const short = reason.length > 40 ? reason.slice(0, 37) + '…' : reason;
                    const s = new Date(lr.startDate); s.setHours(0,0,0,0);
                    const e = new Date(lr.endDate); e.setHours(0,0,0,0);
                    const totalDays = Math.floor((e - s) / (1000*60*60*24)) + 1;
                    const isStart = new Date(day).toDateString() === s.toDateString();
                    const isEnd = new Date(day).toDateString() === e.toDateString();
                    const left = isStart ? '' : '← ';
                    const right = isEnd ? '' : ' →';
                    const span = totalDays > 1 ? ` (${totalDays}d)` : '';
                    return `${left}Leave${type}${short ? ` — ${short}` : ''}${span}${right}`.trim();
                  })();
                  const otBadge = hasOvertime(docUserId, day);
                  const swapInfo = getSwapInfo(docUserId, day);

                  const dayKey = toLocalKey(day);
                  const matchingLeaves = (() => {
                    if (!leaveBadge) return [];
                    return (leaveRequests || []).filter(lr => {
                      if (lr.status !== 'approved') return false;
                      const lrDocId = lr.doctorId?._id || lr.doctorId;
                      if (lrDocId !== docUserId) return false;
                      const d0 = new Date(day); d0.setHours(0,0,0,0);
                      const s = new Date(lr.startDate); s.setHours(0,0,0,0);
                      const e = new Date(lr.endDate); e.setHours(0,0,0,0);
                      return d0 >= s && d0 <= e;
                    });
                  })();
                  const acceptedCoverersForDay = (() => {
                    if (!Array.isArray(matchingLeaves) || matchingLeaves.length === 0) return [];
                    const list = [];
                    matchingLeaves.forEach(lr => {
                      (lr.coveringStaff || []).forEach(cs => {
                        if (cs.status === 'accepted') {
                          const matchesSpecific = cs.shiftDate && toLocalKey(cs.shiftDate) === dayKey;
                          const generic = !cs.shiftDate;
                          if (matchesSpecific || generic) list.push(cs);
                        }
                      });
                    });
                    const byStaff = new Map();
                    list.forEach(cs => {
                      const k = cs.staffId?._id || cs.staffId;
                      if (!byStaff.has(k)) byStaff.set(k, cs);
                    });
                    return Array.from(byStaff.values());
                  })();
                  const coverageNeeded = (() => {
                    if (!leaveBadge) return false;
                    if (!matchingLeaves || matchingLeaves.length === 0) return false;
                    return acceptedCoverersForDay.length === 0;
                  })();
                  const coveredByText = (() => {
                    if (!matchingLeaves || acceptedCoverersForDay.length === 0) return null;
                    const nameSet = new Set();
                    acceptedCoverersForDay.forEach(cs => {
                      const covererId = cs.staffId?._id || cs.staffId;
                      const docObj = doctors.find(d => (d.userId?._id) === covererId);
                      const name = docObj?.userId?.firstname ? `Dr. ${docObj.userId.firstname} ${docObj.userId.lastname}` : 'colleague';
                      nameSet.add(name);
                    });
                    return `Covered by ${Array.from(nameSet).join(', ')}`;
                  })();
                  const covererBadgeText = (() => {
                    const myCovers = (leaveRequests || []).filter(lr => {
                      if (lr.status !== 'approved') return false;
                      const d0 = new Date(day); d0.setHours(0,0,0,0);
                      const s = new Date(lr.startDate); s.setHours(0,0,0,0);
                      const e = new Date(lr.endDate); e.setHours(0,0,0,0);
                      const within = d0 >= s && d0 <= e;
                      return (lr.coveringStaff || []).some(cs => (cs.status === 'accepted') && (cs.staffId?._id || cs.staffId) === docUserId && ((cs.shiftDate && toLocalKey(cs.shiftDate) === dayKey) || (!cs.shiftDate && within)));
                    });
                    if (myCovers.length === 0) return null;
                    const lr = myCovers[0];
                    const rdId = lr.doctorId?._id || lr.doctorId;
                    const rdObj = doctors.find(d => d.userId?._id === rdId);
                    const rdName = rdObj?.userId?.firstname ? `Dr. ${rdObj.userId.firstname} ${rdObj.userId.lastname}` : 'colleague';
                    return `Covering ${rdName}`;
                  })();

                  return (
                    <div key={`${doc._id}-${idx}`} className="doctorScheduling_matrixDayCell">
                      {items.length === 0 && !leaveBadge && (
                        <div className="doctorScheduling_noScheduleSmall">—</div>
                      )}
                      {(leaveBadge || swapInfo || otBadge || coverageNeeded || covererBadgeText) && (
                        <div className="doctorScheduling_badges" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: !leaveBadge && items.length > 0 ? 6 : 0 }}>
                          {leaveBadge && (
                            <span
                              className="doctorScheduling_badge leave"
                              title={leaveDetail || 'Leave'}
                              style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}
                            >
                              {leaveInline || 'Leave'}
                            </span>
                          )}
                          {coveredByText && (
                            <span
                              className="doctorScheduling_badge coveredBy"
                              title={coveredByText}
                              style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}
                            >
                              {coveredByText}
                            </span>
                          )}
                          {coverageNeeded && (
                            <span
                              className="doctorScheduling_badge coverage"
                              title="Coverage needed"
                              style={{ background: '#fff7ed', color: '#9a3412', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}
                            >
                              Coverage needed
                            </span>
                          )}
                          {swapInfo && <span className="doctorScheduling_badge swap" style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}>{swapInfo.text}</span>}
                          {otBadge && <span className="doctorScheduling_badge ot" style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}>OT</span>}
                          {(!leaveBadge && covererBadgeText) && (
                            <span
                              className="doctorScheduling_badge covering"
                              title={covererBadgeText}
                              style={{ background: '#eef2ff', color: '#3730a3', padding: '2px 6px', borderRadius: 6, fontSize: 12 }}
                            >
                              {covererBadgeText}
                            </span>
                          )}
                        </div>
                      )}
                      {!leaveBadge && items.map((schedule) => (
                        <div key={schedule._id} className={`doctorScheduling_shiftPill${schedule.status === 'overtime' ? ' overtime' : ''}`} title={schedule.title}>
                          <div className="doctorScheduling_shiftPillLine1">
                            <span className="doctorScheduling_shiftTitle">{schedule.title}</span>
                            <span className="doctorScheduling_shiftTime">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                          </div>
                          <div className="doctorScheduling_shiftPillLine2">
                            <span>Slot {schedule.slotDuration || 30}m</span>
                            <span>Max {schedule.maxPatients || 0}/h</span>
                            {schedule.status === 'overtime' && <span>Overtime</span>}
                            {schedule.department && <span>{schedule.department}</span>}
                          </div>
                          <button className="doctorScheduling_shiftDelete" onClick={() => onDeleteSchedule(schedule._id, schedule.shiftId)}>✕</button>
                        </div>
                      ))}
                      {!leaveBadge && (() => {
                        const coverLeaves = (leaveRequests || []).filter(lr => {
                          if (lr.status !== 'approved') return false;
                          const d0 = new Date(day); d0.setHours(0,0,0,0);
                          const s = new Date(lr.startDate); s.setHours(0,0,0,0);
                          const e = new Date(lr.endDate); e.setHours(0,0,0,0);
                          const within = d0 >= s && d0 <= e;
                          return (lr.coveringStaff || []).some(cs => (cs.status === 'accepted') && (cs.staffId?._id || cs.staffId) === docUserId && ((cs.shiftDate && toLocalKey(cs.shiftDate) === dayKey) || (!cs.shiftDate && within)));
                        });
                        if (coverLeaves.length === 0) return null;
                        return coverLeaves.slice(0,3).flatMap((lr, idx2) => {
                          const rdId = lr.doctorId?._id || lr.doctorId;
                          const rdItemsRaw = getScheduleForDay(day, rdId);
                          const rdItems = mergeSegmentsForDisplay(rdItemsRaw);
                          const rdObj = doctors.find(d => d.userId?._id === rdId);
                          const rdName = rdObj?.userId?.firstname ? `Dr. ${rdObj.userId.firstname} ${rdObj.userId.lastname}` : 'colleague';
                          return rdItems.map((schedule, idx3) => (
                            <div key={`cov-${idx2}-${idx3}-${schedule._id || schedule.shiftId || idx3}`} className={`doctorScheduling_shiftPill coverage`} title={`Covering ${rdName}: ${schedule.title}`} style={{ border: '1px dashed #6366f1', background: '#eef2ff' }}>
                              <div className="doctorScheduling_shiftPillLine1">
                                <span className="doctorScheduling_shiftTitle">Covering {rdName}</span>
                                <span className="doctorScheduling_shiftTime">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                              </div>
                              <div className="doctorScheduling_shiftPillLine2">
                                <span>{schedule.title}</span>
                                <span>Slot {schedule.slotDuration || 30}m</span>
                                <span>Max {schedule.maxPatients || 0}/h</span>
                                {schedule.department && <span>{schedule.department}</span>}
                              </div>
                            </div>
                          ));
                        });
                      })()}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScheduleMatrix;
