import { HistoryEntry, Workout } from './domain';
import { ActivityDose, Assessment, ReadinessInput } from './whole-person';

const ACTIVE='human-health:active';
const HISTORY='human-health:history';
const ACTIVITY='human-health:activity';
const READINESS='human-health:readiness';
const SKILLS='human-health:skills';
const ASSESSMENTS='human-health:assessments';
const PROGRESSIONS='human-health:progressions';

function read<T>(key:string,fallback:T):T{
  if(typeof window==='undefined')return fallback;
  try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback)) as T}catch{return fallback}
}

export const store={
  loadActive():Workout|null{return read<Workout|null>(ACTIVE,null)},
  saveActive(v:Workout|null){if(typeof window==='undefined')return; if(v)localStorage.setItem(ACTIVE,JSON.stringify(v)); else localStorage.removeItem(ACTIVE)},
  loadHistory():HistoryEntry[]{return read<HistoryEntry[]>(HISTORY,[])},
  saveHistory(v:HistoryEntry[]){if(typeof window==='undefined')return; localStorage.setItem(HISTORY,JSON.stringify(v))},
  loadActivity():ActivityDose[]{return read<ActivityDose[]>(ACTIVITY,[])},
  saveActivity(v:ActivityDose[]){if(typeof window==='undefined')return; localStorage.setItem(ACTIVITY,JSON.stringify(v))},
  loadReadiness():({recordedAt:string;input:ReadinessInput})[]{return read(READINESS,[])},
  saveReadiness(v:{recordedAt:string;input:ReadinessInput}[]){if(typeof window==='undefined')return; localStorage.setItem(READINESS,JSON.stringify(v))},
  loadSkills():Record<string,string>{return read<Record<string,string>>(SKILLS,{})},
  saveSkills(v:Record<string,string>){if(typeof window==='undefined')return; localStorage.setItem(SKILLS,JSON.stringify(v))},
  loadAssessments():Assessment[]{return read<Assessment[]>(ASSESSMENTS,[])},
  saveAssessments(v:Assessment[]){if(typeof window==='undefined')return; localStorage.setItem(ASSESSMENTS,JSON.stringify(v))},
  loadProgressions():Record<string,string>{return read<Record<string,string>>(PROGRESSIONS,{})},
  saveProgressions(v:Record<string,string>){if(typeof window==='undefined')return; localStorage.setItem(PROGRESSIONS,JSON.stringify(v))}
};
