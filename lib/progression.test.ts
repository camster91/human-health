import {describe,expect,it} from 'vitest';
import {nextTrainingRecommendation} from './progression';
import type {WorkoutExercise} from './domain';

function exercise(logs:WorkoutExercise['logs']):WorkoutExercise{return {id:'bench',name:'Bench Press',movement:'horizontal-push',equipment:['barbell'],priority:'primary',repRange:[5,8],sets:2,logs};}

describe('working-set progression',()=>{
  it('does not treat warmups as completed working sets',()=>{
    const result=nextTrainingRecommendation(exercise([{weight:20,reps:10,warmup:true,completedAt:'2026-09-03T12:00:00Z'}]));
    expect(result.action).toBe('baseline');
  });

  it('holds progression when form quality is low',()=>{
    const result=nextTrainingRecommendation(exercise([{weight:80,reps:8,formRating:2,completedAt:'2026-09-03T12:00:00Z'},{weight:80,reps:8,formRating:4,completedAt:'2026-09-03T12:03:00Z'}]));
    expect(result.action).toBe('hold');
  });

  it('advances after all clean working sets reach the top range',()=>{
    const result=nextTrainingRecommendation(exercise([{weight:80,reps:8,rir:2,formRating:4,completedAt:'2026-09-03T12:00:00Z'},{weight:80,reps:8,rir:1,formRating:4,completedAt:'2026-09-03T12:03:00Z'}]));
    expect(result.action).toBe('increase');
  });
});
