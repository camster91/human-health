import { describe, expect, it } from 'vitest';
import { connectedHealthDayPolicy, deviceLocalDayKey, sameDeviceLocalDay } from './local-day';

describe('connected-health device-local day semantics', () => {
  it('uses browser/device local calendar fields for daily buckets', () => {
    const morning = new Date(2026, 8, 4, 0, 5, 0);
    const evening = new Date(2026, 8, 4, 23, 55, 0);
    expect(deviceLocalDayKey(morning)).toBe('2026-09-04');
    expect(deviceLocalDayKey(evening)).toBe('2026-09-04');
    expect(sameDeviceLocalDay(morning, evening)).toBe(true);
  });

  it('separates values across the device-local midnight boundary', () => {
    const beforeMidnight = new Date(2026, 8, 4, 23, 59, 59);
    const afterMidnight = new Date(2026, 8, 5, 0, 0, 1);
    expect(deviceLocalDayKey(beforeMidnight)).toBe('2026-09-04');
    expect(deviceLocalDayKey(afterMidnight)).toBe('2026-09-05');
    expect(sameDeviceLocalDay(beforeMidnight, afterMidnight)).toBe(false);
  });

  it('rejects invalid date values instead of inventing a day', () => {
    expect(deviceLocalDayKey('not-a-date')).toBe('');
    expect(sameDeviceLocalDay('not-a-date', new Date())).toBe(false);
  });

  it('documents that source timezone metadata remains provenance rather than silently changing the dashboard day rule', () => {
    expect(connectedHealthDayPolicy).toContain('browser/device local calendar day');
    expect(connectedHealthDayPolicy).toContain('Original provider timestamps and timezone offsets remain provenance');
  });
});
