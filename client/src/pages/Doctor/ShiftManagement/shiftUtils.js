export const weekdayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export const shortWeekday = (name) => ({
  Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat'
})[name] || name;

export const daysRangeLabel = (days = []) => {
  if (!Array.isArray(days) || days.length === 0) return '-';
  const sorted = [...days].sort((a,b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b));
  const first = shortWeekday(sorted[0]);
  const last = shortWeekday(sorted[sorted.length - 1]);
  return sorted.length > 1 ? `${first}–${last}` : first;
};
