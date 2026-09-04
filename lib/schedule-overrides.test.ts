import {describe,expect,it} from 'vitest';
import type {HistoryEntry} from './domain';
import {contextualRollingSession,nextSessionInSequence,resolveRollingSession} from './schedule';

const completed:HistoryEntry={session:'upper-a',status:'completed',completedAt:'2026-09-03T12:00:00Z',exercises:[]};

describe('manual rolling schedule controls',()=>{
  it('changes one recommended session without rewriting sequence history',()=>{
    const decision=resolveRollingSession([completed],{session:'upper-b',reason:'Lower body is not available today',createdAt:'2026-09-03T13:00:00Z'});
    expect(decision.session).toBe('upper-b');
    expect(decision.manual).toBe(true);
    expect(nextSessionInSequence(completed.session)).toBe('lower-a');
  });

  it('makes recovery and busy modes explicitly conservative',()=>{
    expect(contextualRollingSession([completed],'busy').progressionAllowed).toBe(false);
    expect(contextualRollingSession([completed],'recovery').adaptation).toBe('recovery');
  });
});
