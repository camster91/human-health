import {describe,expect,it} from 'vitest';
import {applyVolumeMultiplier} from './engine';
import type {WorkoutExercise} from './domain';

const exercises:WorkoutExercise[]=[
  {id:'squat',name:'Squat',movement:'squat',equipment:['barbell'],priority:'primary',repRange:[5,8],sets:4,logs:[]},
  {id:'calf',name:'Calf Raise',movement:'calf',equipment:['bodyweight'],priority:'accessory',repRange:[12,20],sets:4,logs:[]},
];

describe('volume scaling',()=>{
  it('reduces volume while preserving a useful primary minimum',()=>{
    const result=applyVolumeMultiplier(exercises,.5);
    expect(result.changed).toBe(true);
    expect(result.exercises[0].sets).toBe(2);
    expect(result.exercises[1].sets).toBe(2);
  });

  it('allows an explicit zero multiplier to withhold the automatic workout',()=>{
    const result=applyVolumeMultiplier(exercises,0);
    expect(result.changed).toBe(true);
    expect(result.exercises).toEqual([]);
  });

  it('does not increase or alter normal volume',()=>{
    expect(applyVolumeMultiplier(exercises,1).exercises).toEqual(exercises);
  });
});
