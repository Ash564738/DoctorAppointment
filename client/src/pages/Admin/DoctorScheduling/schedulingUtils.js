// Shared utilities and constants for Doctor Scheduling UI

export const DEFAULT_SHIFT_CONFIG = {
  day8: {
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  evening8: {
    startTime: "16:00",
    endTime: "23:00",
    breakStart: "20:00",
    breakEnd: "21:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  night8: {
    startTime: "23:00",
    endTime: "07:00",
    breakStart: "03:00",
    breakEnd: "03:30",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  day12: {
    startTime: "07:00",
    endTime: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  night12: {
    startTime: "19:00",
    endTime: "07:00",
    breakStart: "00:00",
    breakEnd: "00:30",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  full24: {
    startTime: "07:00",
    endTime: "07:00",
    breakStart: "00:00",
    breakEnd: "00:30",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  }
};

export function calculateSlotAndMaxPatients(startTime, endTime, breakStart, breakEnd) {
  const toMinutes = t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let start = toMinutes(startTime);
  let end = toMinutes(endTime);
  if (end <= start) end += 24 * 60;
  let total = end - start;
  if (breakStart && breakEnd) {
    let bStart = toMinutes(breakStart);
    let bEnd = toMinutes(breakEnd);
    if (bEnd <= bStart) bEnd += 24 * 60;
    total -= (bEnd - bStart);
  }
  const slotDuration = 30;
  const maxPatientsPerHour = 4;
  return { slotDuration, maxPatientsPerHour };
}

export function getCurrentWeek() {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7; // Monday start
  const start = new Date(today);
  start.setDate(today.getDate() - offset);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekDays(weekStart) {
  const days = [];
  const start = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

export function formatTime(time) {
  if (!time) return '';
  return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const formatShortDate = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });

export const formatRange = (start, end) => {
  const s = new Date(start); const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return `on ${formatShortDate(s)}`;
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  return sameMonth
    ? `${s.toLocaleDateString([], { month: 'short' })} ${s.getDate()}–${e.getDate()}`
    : `${formatShortDate(s)}–${formatShortDate(e)}`;
};

export function mergeSegmentsForDisplay(items) {
  if (!Array.isArray(items) || items.length < 2) return items || [];
  const byKey = {};
  const keyFor = (s) => `${s.title || ''}|${s.department || ''}|${s.doctorId?._id || s.doctorId}`;
  items.forEach(s => {
    const k = keyFor(s);
    if (!byKey[k]) byKey[k] = [];
    byKey[k].push(s);
  });
  const result = [];
  Object.values(byKey).forEach(group => {
    const startMid = group.find(g => g.startTime === '00:00');
    const endLate = group.find(g => g.endTime === '23:59');
    if (startMid && endLate) {
      result.push({
        ...endLate,
        startTime: '00:00',
        endTime: '23:59',
        __merged: true
      });
      group.forEach(g => {
        if (g !== startMid && g !== endLate) result.push(g);
      });
    } else {
      result.push(...group);
    }
  });
  return result;
}
