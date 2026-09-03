import { HistoryEntry, Workout } from './domain';
const ACTIVE='human-health:active'; const HISTORY='human-health:history';
export const store={
  loadActive():Workout|null{if(typeof window==='undefined')return null; try{return JSON.parse(localStorage.getItem(ACTIVE)||'null')}catch{return null}},
  saveActive(v:Workout|null){if(typeof window==='undefined')return; if(v)localStorage.setItem(ACTIVE,JSON.stringify(v)); else localStorage.removeItem(ACTIVE)},
  loadHistory():HistoryEntry[]{if(typeof window==='undefined')return[]; try{return JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{return[]}},
  saveHistory(v:HistoryEntry[]){if(typeof window==='undefined')return; localStorage.setItem(HISTORY,JSON.stringify(v))}
};
