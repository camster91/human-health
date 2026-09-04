import { workingLogs } from '../engine';
import type { ConnectedMetricSummary, ClinicianExportInput } from './types';

export type ClinicianFriendlySummary = {
  schemaVersion: 1;
  generatedAt: string;
  lookbackDays: number;
  framing: string;
  training: {
    sessions: number;
    completed: number;
    partial: number;
    abandoned: number;
    primaryExerciseExposure: Record<string, number>;
  };
  connectedHealth: {
    sources: { id: string; name: string; status: string; lastSuccessAt?: string }[];
    metrics: ConnectedMetricSummary[];
  };
  preventive: {
    records: ClinicianExportInput['preventiveRecords'];
    reminders: ClinicianExportInput['preventiveReminders'];
  };
  dataNotes: string[];
};

export function buildClinicianSummary(input: ClinicianExportInput): ClinicianFriendlySummary {
  const now = input.generatedAt || new Date();
  const lookbackDays = Math.max(30, Math.min(730, Math.floor(input.lookbackDays || 90)));
  const cutoff = now.getTime() - lookbackDays * 86_400_000;
  const history = input.training.history.filter(entry => {
    const at = Date.parse(entry.completedAt);
    return Number.isFinite(at) && at >= cutoff && at <= now.getTime();
  });
  const primaryExerciseExposure: Record<string, number> = {};
  history.forEach(entry => entry.exercises.filter(exercise => exercise.priority === 'primary').forEach(exercise => {
    primaryExerciseExposure[exercise.name] = (primaryExerciseExposure[exercise.name] || 0) + workingLogs(exercise).length;
  }));

  // Keep providers/source ids separate. The clinician summary must never imply
  // that overlapping device/provider samples were combined into one truth.
  const metricGroups = new Map<string, typeof input.connectedObservations>();
  input.connectedObservations.forEach(observation => {
    const at = Date.parse(observation.endTime || observation.startTime);
    if (!Number.isFinite(at) || at < cutoff || at > now.getTime()) return;
    const key = `${observation.metric}|${observation.sourceId}`;
    metricGroups.set(key, [...(metricGroups.get(key) || []), observation]);
  });
  const metrics: ConnectedMetricSummary[] = [...metricGroups.values()].map(observations => {
    const sorted = [...observations].sort((a, b) => Date.parse(a.endTime || a.startTime) - Date.parse(b.endTime || b.startTime));
    const latest = sorted.at(-1)!;
    return {
      metric: latest.metric,
      sourceNames: [...new Set(observations.map(item => item.provenance.sourceName))],
      sampleCount: observations.length,
      latestAt: latest.endTime || latest.startTime,
      latestValue: latest.value,
      unit: latest.unit,
    };
  }).sort((a, b) => a.metric.localeCompare(b.metric) || (a.sourceNames[0] || '').localeCompare(b.sourceNames[0] || ''));

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    lookbackDays,
    framing: 'Human Health is a fitness/lifestyle record. This summary is user-controlled context for discussion and is not a diagnosis, medication/insulin recommendation, emergency monitor, injury clearance, or substitute for source medical records.',
    training: {
      sessions: history.length,
      completed: history.filter(entry => (entry.status || 'completed') === 'completed').length,
      partial: history.filter(entry => entry.status === 'ended-early').length,
      abandoned: history.filter(entry => entry.status === 'abandoned').length,
      primaryExerciseExposure,
    },
    connectedHealth: {
      sources: input.connectedSources.map(source => ({ id: source.id, name: source.displayName, status: source.status, lastSuccessAt: source.lastSuccessAt })),
      metrics,
    },
    preventive: {
      records: [...input.preventiveRecords].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
      reminders: [...input.preventiveReminders].sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
    },
    dataNotes: [
      'Training values come from user-entered workout logs and may be incomplete.',
      'Connected observations remain source-separated; overlapping providers are not silently combined. Sources may be stale, partial, imported, or device-derived.',
      'Preventive records/reminders are user-entered or clinician-provided; Human Health does not prescribe preventive intervals.',
      'Derived summaries are descriptive and should be interpreted alongside original clinical records where relevant.',
    ],
  };
}

export function clinicianSummaryMarkdown(summary: ClinicianFriendlySummary) {
  const lines: string[] = [
    '# Human Health — clinician discussion summary',
    '',
    `Generated: ${summary.generatedAt}`,
    `Lookback: ${summary.lookbackDays} days`,
    '',
    summary.framing,
    '',
    '## Training',
    `Sessions: ${summary.training.sessions} (${summary.training.completed} complete, ${summary.training.partial} partial, ${summary.training.abandoned} abandoned)`,
  ];
  for (const [exercise, sets] of Object.entries(summary.training.primaryExerciseExposure)) lines.push(`- ${exercise}: ${sets} logged working sets`);
  lines.push('', '## Connected health');
  if (!summary.connectedHealth.metrics.length) lines.push('No connected metric samples in the selected lookback window.');
  summary.connectedHealth.metrics.forEach(metric => lines.push(`- ${metric.metric}: ${metric.sampleCount} samples; latest ${metric.latestValue ?? 'n/a'} ${metric.unit || ''} at ${metric.latestAt || 'n/a'}; source: ${metric.sourceNames.join(', ') || 'unknown'}`));
  lines.push('', '## Preventive records');
  if (!summary.preventive.records.length) lines.push('No preventive records entered.');
  summary.preventive.records.forEach(record => lines.push(`- ${record.title} — ${record.occurredAt.slice(0, 10)} (${record.source}${record.provider ? `; ${record.provider}` : ''})`));
  lines.push('', '## User/clinician-entered reminders');
  if (!summary.preventive.reminders.length) lines.push('No reminders entered.');
  summary.preventive.reminders.forEach(reminder => lines.push(`- ${reminder.title} — due ${reminder.dueOn} (${reminder.source})`));
  lines.push('', '## Data notes', ...summary.dataNotes.map(note => `- ${note}`));
  return lines.join('\n');
}
