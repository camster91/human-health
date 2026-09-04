'use client';

import { useEffect, useState } from 'react';
import { GymProfile } from '@/lib/domain';
import { availableSkillTrees, recommendSkillProgression, SkillAssessment } from '@/lib/performance';
import { store } from '@/lib/storage';
import { skillTrees } from '@/lib/whole-person';

export function SkillProgressPanel({ gym }: { gym: GymProfile }) {
  const [skills, setSkills] = useState<Record<string, string>>({});
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [inputs, setInputs] = useState<Record<string, { value: number; assistanceKg: number; variation: string; pain: boolean }>>({});
  const [notice, setNotice] = useState('');
  useEffect(() => { setSkills(store.loadSkills()); setAssessments(store.loadSkillAssessments()); }, []);
  const trees = availableSkillTrees(gym.equipment);

  function currentStepId(treeId: string): string {
    const tree = skillTrees.find(item => item.id === treeId);
    if (!tree) return '';
    const available = tree.steps.filter(step => step.requiredEquipment.every(item => gym.equipment.includes(item)));
    const stored = skills[treeId];
    if (stored && available.some(step => step.id === stored)) return stored;
    return available[0]?.id || tree.steps[0].id;
  }

  function record(treeId: string) {
    const tree = skillTrees.find(item => item.id === treeId);
    const stepId = currentStepId(treeId);
    const step = tree?.steps.find(item => item.id === stepId);
    if (!tree || !step) return;
    const input = inputs[treeId] || { value: 0, assistanceKg: 0, variation: '', pain: false };
    if (!Number.isFinite(input.value) || input.value < 0 || !Number.isFinite(input.assistanceKg) || input.assistanceKg < 0) {
      setNotice('Enter a valid non-negative assessment value and assistance amount.');
      return;
    }
    const entry: SkillAssessment = {
      treeId,
      stepId,
      passed: input.value >= (step.targetValue || 0),
      clean: !input.pain,
      pain: input.pain,
      metric: step.metric,
      value: input.value,
      assistanceKg: step.id === 'assisted' ? input.assistanceKg : undefined,
      externalLoadKg: step.metric === 'external-load-kg' ? input.value : undefined,
      variation: input.variation.trim(),
      recordedAt: new Date().toISOString(),
    };
    const next = [...assessments, entry];
    if (!store.saveSkillAssessments(next)) { setNotice('The skill assessment could not be saved.'); return; }
    setAssessments(next);
    setNotice('Skill assessment saved.');
  }

  function apply(treeId: string, stepId: string) {
    const next = { ...skills, [treeId]: stepId };
    if (!store.saveSkills(next)) { setNotice('The selected skill level could not be saved.'); return; }
    setSkills(next);
  }

  return <section className="card" aria-labelledby="skills-title">
    <h2 id="skills-title">Bodyweight skills</h2>
    <p className="muted">Progressions are equipment-aware and require two clean, comparable assessments. Assistance and external load are tracked rather than discarded.</p>
    {notice && <div className="connection-state" role="status" aria-live="polite">{notice}</div>}
    {trees.length === 0 && <p>No compatible bodyweight skill tree is available in this equipment profile.</p>}
    {trees.map(tree => {
      const stepId = currentStepId(tree.id);
      const step = tree.steps.find(item => item.id === stepId) || tree.steps[0];
      const recommendation = recommendSkillProgression(tree.id, step.id, assessments);
      const input = inputs[tree.id] || { value: 0, assistanceKg: 0, variation: '', pain: false };
      return <div className="skill-block" key={tree.id}>
        <div className="exercise-title"><div><span className="pill">{tree.name}</span><h3>{step.name}</h3><p className="muted">Target: {step.target}</p></div><select aria-label={`${tree.name} level`} value={step.id} onChange={event => apply(tree.id, event.target.value)}>{tree.steps.filter(item => item.requiredEquipment.every(required => gym.equipment.includes(required))).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="settings-grid"><label><b>{step.metric === 'seconds' ? 'Seconds' : step.metric === 'external-load-kg' ? 'Added load (kg)' : 'Best clean reps'}</b><input type="number" min="0" step="0.5" value={input.value} onChange={event => setInputs({ ...inputs, [tree.id]: { ...input, value: Number(event.target.value) } })}/></label>{step.id === 'assisted' && <label><b>Assistance (kg)</b><input type="number" min="0" step="0.5" value={input.assistanceKg} onChange={event => setInputs({ ...inputs, [tree.id]: { ...input, assistanceKg: Number(event.target.value) } })}/></label>}<label><b>Test condition</b><input value={input.variation} placeholder="e.g. assisted machine" onChange={event => setInputs({ ...inputs, [tree.id]: { ...input, variation: event.target.value } })}/></label><button className={input.pain ? 'warning active' : ''} aria-pressed={input.pain} onClick={() => setInputs({ ...inputs, [tree.id]: { ...input, pain: !input.pain } })}>Discomfort {input.pain ? 'flagged' : 'not flagged'}</button></div>
        <button className="primary" onClick={() => record(tree.id)}>Record assessment</button>
        <div className="coach-note">{recommendation.message}</div>
        {recommendation.action !== 'hold' && <button className="link" onClick={() => apply(tree.id, recommendation.stepId)}>Apply {recommendation.action}: {tree.steps.find(item => item.id === recommendation.stepId)?.name}</button>}
      </div>;
    })}
  </section>;
}
