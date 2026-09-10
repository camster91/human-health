import { describe, expect, it } from 'vitest';
import { athleticPlan, corePrescription, mobilityPrescription } from './whole-person';
import { cardioOptions, cardioPrescription, readinessDecision } from './whole-person-recovery';
import { powerAllowed, strengthLoadAdjustment } from './load-management';
import { minimumEffectiveDay } from './performance';

const emptyLoad = {
  lowerSets: 0,
  upperSets: 0,
  lowerBodySets: 0,
  lowerBodyRecent: false,
  hoursSinceLower: null,
  hoursSinceAny: null,
  hardCardioMinutes: 0,
  hoursSinceHardCardio: null,
  message: 'No recent load.',
};

describe('Issue #89: pain/illness flags block exercise prescription', () => {
  describe('readiness decision with pain or illness', () => {
    it('sets recovery level with zero volume when pain is flagged', () => {
      const decision = readinessDecision({ pain: true });
      expect(decision.level).toBe('recovery');
      expect(decision.volumeMultiplier).toBe(0);
      expect(decision.allowProgression).toBe(false);
      expect(decision.reasons).toContain('Pain or unusual discomfort was reported.');
    });

    it('sets recovery level with zero volume when illness is flagged', () => {
      const decision = readinessDecision({ illness: true });
      expect(decision.level).toBe('recovery');
      expect(decision.volumeMultiplier).toBe(0);
      expect(decision.allowProgression).toBe(false);
      expect(decision.reasons).toContain('Illness was reported.');
    });

    it('sets recovery level when both pain and illness are flagged', () => {
      const decision = readinessDecision({ pain: true, illness: true });
      expect(decision.level).toBe('recovery');
      expect(decision.volumeMultiplier).toBe(0);
      expect(decision.allowProgression).toBe(false);
      expect(decision.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('does not confuse pain/illness with high soreness or fatigue', () => {
      const reduced = readinessDecision({ fatigue: 'high', soreness: 'high' });
      expect(reduced.level).toBe('reduced');
      expect(reduced.volumeMultiplier).toBeGreaterThan(0);
      
      const pain = readinessDecision({ pain: true });
      expect(pain.level).toBe('recovery');
      expect(pain.volumeMultiplier).toBe(0);
    });
  });

  describe('cardio prescription blocking', () => {
    it('returns empty cardio options when recovery level is set', () => {
      const options = cardioOptions(60, 150, 'recovery', 30);
      expect(options).toEqual([]);
    });

    it('provides cardio options for normal readiness', () => {
      const options = cardioOptions(60, 150, 'normal', 30);
      expect(options.length).toBeGreaterThan(0);
      expect(options.some(opt => opt.type === 'steady')).toBe(true);
    });

    it('provides reduced cardio options for reduced readiness', () => {
      const options = cardioOptions(60, 150, 'reduced', 30);
      expect(options.length).toBeGreaterThan(0);
      expect(options.some(opt => opt.type === 'intervals')).toBe(false);
    });

    it('blocks cardio prescription with adult terse safety message', () => {
      const prescription = cardioPrescription(60, 150, 30, 'recovery');
      expect(prescription.minutes).toBe(0);
      expect(prescription.message).toContain('Pain or illness was flagged');
      expect(prescription.message).toContain('Human Health pauses automatic cardio suggestions');
      expect(prescription.message).toContain('cannot determine whether exercise is safe');
      expect(prescription.message).not.toMatch(/sorry|apologize|unfortunately/i);
    });
  });

  describe('strength prescription blocking', () => {
    it('blocks strength with zero volume multiplier on recovery', () => {
      const adjustment = strengthLoadAdjustment('upper-a', emptyLoad, 'recovery');
      expect(adjustment.volumeMultiplier).toBe(0);
      expect(adjustment.reduce).toBe(true);
      expect(adjustment.pauseProgression).toBe(true);
      expect(adjustment.reason).toContain('Pain or illness was flagged');
      expect(adjustment.reason).toContain('pauses automatic strength suggestions');
    });

    it('allows reduced strength for reduced readiness', () => {
      const adjustment = strengthLoadAdjustment('upper-a', emptyLoad, 'reduced');
      expect(adjustment.volumeMultiplier).toBeGreaterThan(0);
      expect(adjustment.volumeMultiplier).toBeLessThan(1);
    });

    it('allows normal strength for normal readiness', () => {
      const adjustment = strengthLoadAdjustment('upper-a', emptyLoad, 'normal');
      expect(adjustment.volumeMultiplier).toBe(1);
      expect(adjustment.reduce).toBe(false);
    });
  });

  describe('core prescription blocking', () => {
    it('returns empty array when recovery level is set', () => {
      const core = corePrescription({ 
        session: 'upper-a', 
        equipment: ['bodyweight', 'cable', 'dumbbell'], 
        readiness: 'recovery' 
      });
      expect(core).toEqual([]);
    });

    it('provides core work for normal readiness', () => {
      const core = corePrescription({ 
        session: 'upper-a', 
        equipment: ['bodyweight', 'cable', 'dumbbell'], 
        readiness: 'normal' 
      });
      expect(core.length).toBeGreaterThan(0);
    });

    it('provides reduced core work for reduced readiness', () => {
      const normal = corePrescription({ 
        session: 'upper-a', 
        equipment: ['bodyweight', 'cable', 'dumbbell'], 
        readiness: 'normal' 
      });
      const reduced = corePrescription({ 
        session: 'upper-a', 
        equipment: ['bodyweight', 'cable', 'dumbbell'], 
        readiness: 'reduced' 
      });
      expect(reduced.length).toBeLessThan(normal.length);
      expect(reduced.length).toBeGreaterThan(0);
    });
  });

  describe('athletic plan blocking', () => {
    it('returns empty array when recovery level is set', () => {
      const plans = athleticPlan([], 'recovery');
      expect(plans).toEqual([]);
    });

    it('returns empty array when recovery level is set even with assessments', () => {
      const assessments = [
        { metricId: 'single-leg-balance', value: 40, recordedAt: new Date().toISOString() },
        { metricId: 'jump', value: 25, recordedAt: new Date().toISOString() },
      ];
      const plans = athleticPlan(assessments, 'recovery', { highImpactAllowed: true });
      expect(plans).toEqual([]);
    });

    it('provides athletic plans for normal readiness', () => {
      const plans = athleticPlan([], 'normal');
      expect(plans.length).toBeGreaterThan(0);
    });

    it('provides reduced athletic plans for reduced readiness', () => {
      const plans = athleticPlan([], 'reduced');
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.every(plan => plan.domain !== 'power')).toBe(true);
    });
  });

  describe('power work blocking', () => {
    it('blocks power when recovery level is set', () => {
      const result = powerAllowed(emptyLoad, 'recovery', true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Pain or illness was flagged');
      expect(result.reason).toContain('pauses automatic athletic exercise suggestions');
    });

    it('allows power for normal readiness with permission', () => {
      const result = powerAllowed(emptyLoad, 'normal', true);
      expect(result.allowed).toBe(true);
    });

    it('blocks power for reduced readiness', () => {
      const result = powerAllowed(emptyLoad, 'reduced', true);
      expect(result.allowed).toBe(false);
    });
  });

  describe('minimum effective day blocking', () => {
    it('blocks all suggestions with adult terse safety message on recovery', () => {
      const plan = minimumEffectiveDay({
        availableMinutes: 30,
        activity: [],
        readiness: { level: 'recovery', volumeMultiplier: 0, allowProgression: false, reasons: ['Pain was flagged.'] },
        mode: 'normal',
        equipment: ['bodyweight', 'dumbbell'],
      });
      expect(plan.minutes).toBe(0);
      expect(plan.domains).toEqual([]);
      expect(plan.sessionIds).toEqual([]);
      expect(plan.message).toContain('Pain or illness was flagged');
      expect(plan.message).toContain('pauses automatic exercise suggestions');
      expect(plan.message).toContain('cannot determine whether training is safe');
      expect(plan.message).not.toMatch(/sorry|apologize|unfortunately/i);
    });

    it('provides minimum effective options for normal readiness', () => {
      const plan = minimumEffectiveDay({
        availableMinutes: 30,
        activity: [],
        readiness: { level: 'normal', volumeMultiplier: 1, allowProgression: true, reasons: [] },
        mode: 'normal',
        equipment: ['bodyweight', 'dumbbell'],
        cardioTargetMinutes: 150,
        priorities: { strength: 'focus', cardio: 'maintain' },
      });
      expect(plan.minutes).toBeGreaterThan(0);
      expect(plan.domains.length).toBeGreaterThan(0);
    });

    it('provides reduced minimum effective options for reduced readiness', () => {
      const plan = minimumEffectiveDay({
        availableMinutes: 30,
        activity: [],
        readiness: { level: 'reduced', volumeMultiplier: 0.85, allowProgression: false, reasons: ['Fatigue is high.'] },
        mode: 'normal',
        equipment: ['bodyweight', 'dumbbell'],
      });
      expect(plan.minutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('mobility prescription (no blocking expected)', () => {
    it('provides mobility prescription regardless of readiness level', () => {
      const normal = mobilityPrescription('upper-a', 'prepare', 6);
      expect(normal.minutes).toBeGreaterThan(0);
      expect(normal.items.length).toBeGreaterThan(0);
      
      const restore = mobilityPrescription('lower-a', 'restore', 10);
      expect(restore.minutes).toBeGreaterThan(0);
      expect(restore.items.length).toBeGreaterThan(0);
    });
  });

  describe('fail-closed philosophy verification', () => {
    it('prefers no prescription over reduced prescription on pain/illness', () => {
      const pain = readinessDecision({ pain: true });
      const highFatigue = readinessDecision({ fatigue: 'high', stress: 'high' });
      
      expect(pain.volumeMultiplier).toBe(0);
      expect(highFatigue.volumeMultiplier).toBeGreaterThan(0);
    });

    it('uses adult terse tone in all recovery messages', () => {
      const cardio = cardioPrescription(60, 150, 30, 'recovery');
      const strength = strengthLoadAdjustment('upper-a', emptyLoad, 'recovery');
      const power = powerAllowed(emptyLoad, 'recovery', true);
      const minimum = minimumEffectiveDay({
        availableMinutes: 30,
        activity: [],
        readiness: { level: 'recovery', volumeMultiplier: 0, allowProgression: false, reasons: ['Pain was flagged.'] },
      });

      const messages = [cardio.message, strength.reason, power.reason, minimum.message];
      for (const msg of messages) {
        expect(msg).not.toMatch(/sorry|apologize|unfortunately|worried|concerned/i);
        expect(msg).toContain('pauses automatic');
      }
    });

    it('never recommends lighter alternatives when pain/illness is flagged', () => {
      const options = cardioOptions(0, 150, 'recovery', 30);
      const core = corePrescription({ session: 'upper-a', equipment: ['bodyweight'], readiness: 'recovery' });
      const athletic = athleticPlan([], 'recovery');
      
      expect(options).toEqual([]);
      expect(core).toEqual([]);
      expect(athletic).toEqual([]);
    });
  });

  describe('combined stress vs pain/illness distinction', () => {
    it('handles pain with other stress factors as recovery', () => {
      const decision = readinessDecision({ 
        pain: true, 
        sleep: 'poor', 
        fatigue: 'high', 
        stress: 'high' 
      });
      expect(decision.level).toBe('recovery');
      expect(decision.volumeMultiplier).toBe(0);
    });

    it('handles illness with other stress factors as recovery', () => {
      const decision = readinessDecision({ 
        illness: true, 
        soreness: 'high', 
        subjective: 1 
      });
      expect(decision.level).toBe('recovery');
      expect(decision.volumeMultiplier).toBe(0);
    });

    it('handles multiple stress factors without pain/illness as reduced', () => {
      const decision = readinessDecision({ 
        sleep: 'poor', 
        fatigue: 'high', 
        stress: 'high' 
      });
      expect(decision.level).toBe('reduced');
      expect(decision.volumeMultiplier).toBeGreaterThan(0);
      expect(decision.volumeMultiplier).toBeLessThan(1);
    });
  });
});
