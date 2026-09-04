export const connectedHealthDayPolicy = 'Daily connected-health dashboards use the current browser/device local calendar day for event instants. Original provider timestamps and timezone offsets remain provenance and are not rewritten. Historical source-local-day views, if added later, must be explicit rather than silently mixing day rules.';

export function deviceLocalDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function sameDeviceLocalDay(value: string | Date, target: Date) {
  const key = deviceLocalDayKey(value);
  return Boolean(key) && key === deviceLocalDayKey(target);
}
