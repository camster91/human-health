import { capabilityMetrics, minimumEffectiveOptions, weeklyTargets } from '@/lib/whole-person';

export function TodayWholePerson({strengthSessions}:{strengthSessions:number}){
  const cardio=weeklyTargets.find(t=>t.domain==='cardio');
  const quick=minimumEffectiveOptions(10,['mobility','core','bodyweight']);
  return <section className="card" aria-labelledby="whole-person-title">
    <h3 id="whole-person-title">Whole-person fitness</h3>
    <div className="metrics">
      <span><b>Strength</b>{strengthSessions}/4 recent sessions</span>
      <span><b>Cardio</b>{cardio?.minutes||150} min weekly target</span>
      <span><b>Mobility</b>3 short sessions / week</span>
      <span><b>Body control</b>Pull-up + push-up skills</span>
    </div>
    {quick[0]&&<p className="muted" style={{marginTop:12,marginBottom:0}}>Short on time? {quick[0].name} takes about {quick[0].minutes} minutes and can complement—not replace—the main plan.</p>}
  </section>;
}

export function CapabilityPanel(){
  return <section className="card" aria-labelledby="capability-title">
    <h2 id="capability-title">Capability map</h2>
    <p className="muted">Each domain stays measurable on its own. Human Health does not collapse these into a universal health score.</p>
    {capabilityMetrics.map(metric=><div className="history" key={metric.id}>
      <b>{metric.name}</b><span>{metric.unit}</span><small>{metric.domain} · {metric.description}</small>
    </div>)}
  </section>;
}
