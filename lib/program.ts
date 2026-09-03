import { Exercise, GymProfile, SessionId } from './domain';

export const exercises: Exercise[] = [
  {id:'bench',name:'Barbell Bench Press',movement:'horizontal-push',equipment:['barbell','bench','rack'],priority:'primary',repRange:[5,8]},
  {id:'row',name:'Barbell Row',movement:'horizontal-pull',equipment:['barbell'],priority:'primary',repRange:[6,10]},
  {id:'ohp',name:'Barbell Overhead Press',movement:'vertical-push',equipment:['barbell','rack'],priority:'secondary',repRange:[6,10]},
  {id:'pulldown',name:'Cable Lat Pulldown',movement:'vertical-pull',equipment:['cable'],priority:'secondary',repRange:[8,12]},
  {id:'pullup',name:'Pull-Up',movement:'vertical-pull',equipment:['bodyweight'],priority:'secondary',repRange:[5,10]},
  {id:'squat',name:'Barbell Back Squat',movement:'squat',equipment:['barbell','rack'],priority:'primary',repRange:[5,8]},
  {id:'rdl',name:'Romanian Deadlift',movement:'hinge',equipment:['barbell'],priority:'primary',repRange:[6,10]},
  {id:'split-squat',name:'Bulgarian Split Squat',movement:'single-leg',equipment:['bench','bodyweight'],priority:'secondary',repRange:[8,12]},
  {id:'hip-thrust',name:'Barbell Hip Thrust',movement:'glute',equipment:['barbell','bench'],priority:'secondary',repRange:[8,12]},
  {id:'calf',name:'Standing Calf Raise',movement:'calf',equipment:['bodyweight'],priority:'accessory',repRange:[12,20]},
  {id:'incline',name:'Incline Barbell Press',movement:'horizontal-push',equipment:['barbell','bench','rack'],priority:'primary',repRange:[6,10]},
  {id:'cable-row',name:'Cable Row',movement:'horizontal-pull',equipment:['cable'],priority:'primary',repRange:[8,12]},
  {id:'pushdown',name:'Cable Triceps Pushdown',movement:'triceps',equipment:['cable'],priority:'accessory',repRange:[10,15]},
  {id:'curl',name:'Cable Curl',movement:'biceps',equipment:['cable'],priority:'accessory',repRange:[10,15]},
  {id:'pallof',name:'Pallof Press',movement:'core',equipment:['cable'],priority:'accessory',repRange:[8,12]},
  {id:'plank',name:'Plank',movement:'core',equipment:['bodyweight'],priority:'accessory',repRange:[30,60]},
  {id:'machine-chest',name:'Chest Press Machine',movement:'horizontal-push',equipment:['machine'],priority:'primary',repRange:[6,10]},
  {id:'dumbbell-bench',name:'Dumbbell Bench Press',movement:'horizontal-push',equipment:['dumbbell','bench'],priority:'primary',repRange:[6,10]},
  {id:'machine-row',name:'Machine Row',movement:'horizontal-pull',equipment:['machine'],priority:'primary',repRange:[8,12]},
  {id:'leg-press',name:'Leg Press',movement:'squat',equipment:['machine'],priority:'primary',repRange:[8,12]},
  {id:'db-rdl',name:'Dumbbell RDL',movement:'hinge',equipment:['dumbbell'],priority:'primary',repRange:[8,12]},
];

const byId = Object.fromEntries(exercises.map(e => [e.id,e]));
export const starterProgram: Record<SessionId,{id:string;sets:number}[]> = {
  'upper-a': [{id:'bench',sets:4},{id:'row',sets:4},{id:'ohp',sets:3},{id:'pulldown',sets:3},{id:'pallof',sets:3},{id:'pushdown',sets:3},{id:'curl',sets:3}],
  'lower-a': [{id:'squat',sets:4},{id:'rdl',sets:3},{id:'split-squat',sets:3},{id:'hip-thrust',sets:3},{id:'calf',sets:4},{id:'plank',sets:3}],
  'upper-b': [{id:'incline',sets:4},{id:'row',sets:3},{id:'ohp',sets:3},{id:'pullup',sets:3},{id:'pushdown',sets:3},{id:'curl',sets:3}],
  'lower-b': [{id:'squat',sets:3},{id:'rdl',sets:3},{id:'split-squat',sets:3},{id:'hip-thrust',sets:3},{id:'calf',sets:4},{id:'pallof',sets:3}],
};

export const gyms: GymProfile[] = [
  {id:'work',name:'Work Gym',equipment:['barbell','rack','bench','cable','bodyweight']},
  {id:'commercial',name:'Commercial Gym',equipment:['barbell','rack','bench','cable','bodyweight','dumbbell','machine']},
  {id:'home',name:'Home / Bodyweight',equipment:['bodyweight']},
];

export function buildSession(session: SessionId){
  return starterProgram[session].map(item => ({...byId[item.id],sets:item.sets,logs:[]}));
}

export function substitutions(exercise: Exercise, gym: GymProfile){
  return exercises.filter(e => e.id!==exercise.id && e.movement===exercise.movement && e.equipment.every(eq=>gym.equipment.includes(eq)));
}
