import {describe,expect,it} from 'vitest';
import type {HistoryEntry} from './domain';
import {advanceSession,contextualRollingSession} from './schedule';

const completed:HistoryEntry={session:'upper-a',status:'completed',completedAt:'2026-09-03T12:00:00Z',exercises:[]};

describe('manual rolling schedule controls',()=>{
  it('changes one recommended session without rewriting sequence history',()=>{
    const decision=contextualRollingSession([completed],'normal','upper-b');
    expect(decision.session).toBe('upper-b');
    expect(decision.manual).toBe(true);
    expect(advanceSession(completed.session)).toBe('lower-a');
  });

  it('makes travel and maintenance modes explicitly conservative',()=>{
    expect(contextualRollingSession([completed],'travel').progressionAllowed).toBe(false);
    expect(contextualRollingSession([completed],'maintenance','lower-a','reduced').adaptation).toBe('maintenance');
    expect(contextualRollingSession([completed],'maintenance','lower-a','reduced').progressionAllowed).toBe(false);
  });
});
