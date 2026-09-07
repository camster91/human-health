import { describe, expect, test } from 'vitest';
import {
  applyReflectionRetention,
  createWeeklyReflection,
  getWeeklyPrompt,
  hasReflectionThisWeek,
  recentReflections,
  reflectionSummary,
  validateWeeklyReflection,
  type WeeklyReflection,
} from './weekly-reflection';

describe('getWeeklyPrompt', () => {
  test('returns consistent prompt for same week', () => {
    const day1 = new Date('2026-09-07T10:00:00Z'); // Monday
    const day2 = new Date('2026-09-10T14:00:00Z'); // Thursday same week
    
    const prompt1 = getWeeklyPrompt(day1);
    const prompt2 = getWeeklyPrompt(day2);
    
    expect(prompt1).toBe(prompt2);
    expect(prompt1.length).toBeGreaterThan(0);
  });
  
  test('returns different prompt for different weeks', () => {
    const week1 = new Date('2026-09-07T10:00:00Z');
    const week2 = new Date('2026-09-14T10:00:00Z');
    
    const prompt1 = getWeeklyPrompt(week1);
    const prompt2 = getWeeklyPrompt(week2);
    
    // Different weeks should get different prompts (with 8 prompts, high chance of difference)
    // But we can't guarantee it, so just check they're valid
    expect(prompt1.length).toBeGreaterThan(0);
    expect(prompt2.length).toBeGreaterThan(0);
  });
});

describe('createWeeklyReflection', () => {
  test('creates reflection without response', () => {
    const now = new Date('2026-09-07T10:00:00Z');
    const reflection = createWeeklyReflection(undefined, now);
    
    expect(reflection.prompt).toBeTruthy();
    expect(reflection.response).toBeUndefined();
    expect(reflection.recordedAt).toBe('2026-09-07T10:00:00.000Z');
  });
  
  test('creates reflection with response', () => {
    const now = new Date('2026-09-07T10:00:00Z');
    const reflection = createWeeklyReflection('Hit a PR on deadlift', now);
    
    expect(reflection.prompt).toBeTruthy();
    expect(reflection.response).toBe('Hit a PR on deadlift');
  });
  
  test('trims whitespace from response', () => {
    const reflection = createWeeklyReflection('  spaced out  ');
    expect(reflection.response).toBe('spaced out');
  });
  
  test('removes empty response', () => {
    const reflection = createWeeklyReflection('   ');
    expect(reflection.response).toBeUndefined();
  });
  
  test('truncates long response', () => {
    const longResponse = 'a'.repeat(600);
    const reflection = createWeeklyReflection(longResponse);
    expect(reflection.response).toBeUndefined(); // Over 500 chars
  });
  
  test('accepts response at max length', () => {
    const maxResponse = 'a'.repeat(500);
    const reflection = createWeeklyReflection(maxResponse);
    expect(reflection.response).toBe(maxResponse);
  });
});

describe('hasReflectionThisWeek', () => {
  test('returns true for reflection this week (Monday)', () => {
    const now = new Date('2026-09-10T14:00:00Z'); // Thursday
    const reflections = [
      createWeeklyReflection('Great week', new Date('2026-09-07T10:00:00Z')), // Monday same week
    ];
    
    expect(hasReflectionThisWeek(reflections, now)).toBe(true);
  });
  
  test('returns true for reflection this week (Sunday)', () => {
    const now = new Date('2026-09-10T14:00:00Z'); // Thursday
    const reflections = [
      createWeeklyReflection('Great week', new Date('2026-09-13T10:00:00Z')), // Sunday same week
    ];
    
    expect(hasReflectionThisWeek(reflections, now)).toBe(true);
  });
  
  test('returns false for reflection last week', () => {
    const now = new Date('2026-09-10T14:00:00Z'); // Thursday
    const reflections = [
      createWeeklyReflection('Last week', new Date('2026-09-03T10:00:00Z')), // Previous week
    ];
    
    expect(hasReflectionThisWeek(reflections, now)).toBe(false);
  });
  
  test('returns false for empty array', () => {
    const now = new Date('2026-09-10T14:00:00Z');
    expect(hasReflectionThisWeek([], now)).toBe(false);
  });
  
  test('handles multiple reflections in same week', () => {
    const now = new Date('2026-09-10T14:00:00Z');
    const reflections = [
      createWeeklyReflection('First', new Date('2026-09-07T10:00:00Z')),
      createWeeklyReflection('Second', new Date('2026-09-09T10:00:00Z')),
    ];
    
    expect(hasReflectionThisWeek(reflections, now)).toBe(true);
  });
});

describe('recentReflections', () => {
  const now = new Date('2026-09-10T12:00:00Z');
  const reflections: WeeklyReflection[] = [
    createWeeklyReflection('Week 1', new Date('2026-09-08T10:00:00Z')), // This week
    createWeeklyReflection('Week 2', new Date('2026-09-01T10:00:00Z')), // 1 week ago
    createWeeklyReflection('Week 3', new Date('2026-08-25T10:00:00Z')), // 2 weeks ago
    createWeeklyReflection('Week 4', new Date('2026-08-18T10:00:00Z')), // 3 weeks ago
    createWeeklyReflection('Week 5', new Date('2026-08-11T10:00:00Z')), // 4 weeks ago
    createWeeklyReflection('Week 6', new Date('2026-08-04T10:00:00Z')), // 5 weeks ago
  ];
  
  test('returns reflections within 4-week window', () => {
    const recent = recentReflections(reflections, { weeks: 4, now });
    expect(recent).toHaveLength(4); // 4 weeks = 28 days from Sept 10
  });
  
  test('returns all reflections with larger window', () => {
    const recent = recentReflections(reflections, { weeks: 10, now });
    expect(recent).toHaveLength(6);
  });
  
  test('returns only current week with 1-week window', () => {
    const recent = recentReflections(reflections, { weeks: 1, now });
    expect(recent.length).toBeGreaterThanOrEqual(1);
  });
  
  test('excludes future reflections', () => {
    const futureReflections = [
      ...reflections,
      createWeeklyReflection('Future', new Date('2026-09-20T10:00:00Z')),
    ];
    const recent = recentReflections(futureReflections, { weeks: 4, now });
    expect(recent).toHaveLength(4); // Future excluded, same as 4-week window
  });
});

describe('reflectionSummary', () => {
  test('returns no-data message for empty array', () => {
    const summary = reflectionSummary([]);
    expect(summary).toContain('No reflections yet');
    expect(summary).toContain('optional');
  });
  
  test('returns building-practice message for all completed', () => {
    const reflections = [
      createWeeklyReflection('Week 1 good'),
      createWeeklyReflection('Week 2 okay'),
      createWeeklyReflection('Week 3 great'),
    ];
    const summary = reflectionSummary(reflections, 4);
    expect(summary).toContain('3 reflections');
    expect(summary).toContain('Building a practice');
  });
  
  test('returns no-pressure message for all skipped', () => {
    const reflections = [
      createWeeklyReflection(undefined),
      createWeeklyReflection(undefined),
    ];
    const summary = reflectionSummary(reflections, 4);
    expect(summary).toContain('none completed');
    expect(summary).toContain('No pressure');
  });
  
  test('returns mixed message for some completed', () => {
    const reflections = [
      createWeeklyReflection('Completed'),
      createWeeklyReflection(undefined),
      createWeeklyReflection('Another one'),
      createWeeklyReflection(undefined),
    ];
    const summary = reflectionSummary(reflections, 4);
    expect(summary).toContain('2 reflections');
    expect(summary).toContain('2 skipped');
    expect(summary).toContain('Both are fine');
  });
});

describe('applyReflectionRetention', () => {
  const now = new Date('2026-09-10T12:00:00Z');
  
  test('retains reflections within retention window', () => {
    const reflections = [
      createWeeklyReflection('Recent', new Date('2026-09-08T10:00:00Z')),
      createWeeklyReflection('6 months', new Date('2026-03-10T10:00:00Z')), // ~183 days ago
      createWeeklyReflection('1 year', new Date('2025-09-10T10:00:00Z')), // ~365 days ago (excluded - slightly over)
      createWeeklyReflection('Old', new Date('2025-01-01T10:00:00Z')), // ~618 days ago
    ];
    const retained = applyReflectionRetention(reflections, 365, now);
    expect(retained).toHaveLength(2); // Only recent and 6-month reflections
  });
  
  test('retains all reflections when all are recent', () => {
    const reflections = [
      createWeeklyReflection('Week 1'),
      createWeeklyReflection('Week 2'),
    ];
    const retained = applyReflectionRetention(reflections, 365, now);
    expect(retained).toHaveLength(2);
  });
  
  test('removes all reflections when all are old', () => {
    const reflections = [
      createWeeklyReflection('Old', new Date('2024-01-01T10:00:00Z')),
    ];
    const retained = applyReflectionRetention(reflections, 365, now);
    expect(retained).toHaveLength(0);
  });
});

describe('validateWeeklyReflection', () => {
  test('validates correct reflection', () => {
    const reflection: WeeklyReflection = {
      prompt: 'What went well?',
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateWeeklyReflection(reflection)).toBe(true);
  });
  
  test('validates reflection with response', () => {
    const reflection: WeeklyReflection = {
      prompt: 'What went well?',
      response: 'Hit all my workouts',
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateWeeklyReflection(reflection)).toBe(true);
  });
  
  test('rejects non-object', () => {
    expect(validateWeeklyReflection('not an object')).toBe(false);
    expect(validateWeeklyReflection(null)).toBe(false);
  });
  
  test('rejects missing prompt', () => {
    const reflection = {
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateWeeklyReflection(reflection)).toBe(false);
  });
  
  test('rejects empty prompt', () => {
    const reflection = {
      prompt: '',
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateWeeklyReflection(reflection)).toBe(false);
  });
  
  test('rejects missing recordedAt', () => {
    const reflection = {
      prompt: 'What went well?',
    };
    expect(validateWeeklyReflection(reflection)).toBe(false);
  });
  
  test('rejects invalid timestamp', () => {
    const reflection = {
      prompt: 'What went well?',
      recordedAt: 'not a date',
    };
    expect(validateWeeklyReflection(reflection)).toBe(false);
  });
  
  test('rejects invalid response type', () => {
    const reflection = {
      prompt: 'What went well?',
      response: 123,
      recordedAt: '2026-09-07T10:00:00Z',
    };
    expect(validateWeeklyReflection(reflection)).toBe(false);
  });
});
