import type { HealthObservation, HealthSourceState } from '../connected-health';
import type { HumanHealthExport } from '../storage';
import type { IntegrationBundle, IntegrationScope, PreventiveRecord, PreventiveReminder } from './types';

export const integrationScopes: IntegrationScope[] = ['training:read', 'connected-health:read', 'preventive:read', 'coaching:read'];

export function normalizeScopes(scopes: IntegrationScope[]) {
  return [...new Set(scopes.filter(scope => integrationScopes.includes(scope)))];
}

export function createIntegrationBundle(options: {
  scopes: IntegrationScope[];
  training: HumanHealthExport;
  connectedObservations: HealthObservation[];
  connectedSources: HealthSourceState[];
  preventiveRecords: PreventiveRecord[];
  preventiveReminders: PreventiveReminder[];
  generatedAt?: Date;
}): IntegrationBundle {
  const scopes = normalizeScopes(options.scopes);
  if (!scopes.length) throw new Error('At least one explicit integration scope is required.');
  const bundle: IntegrationBundle = {
    schemaVersion: 1,
    generatedAt: (options.generatedAt || new Date()).toISOString(),
    scopes,
    safety: 'This bundle was generated after an explicit user export/share action. Receiving systems must preserve provenance and must not infer diagnosis, medication/insulin dosing, emergency monitoring, or injury clearance from Human Health data.',
  };
  if (scopes.includes('training:read')) bundle.training = options.training;
  if (scopes.includes('connected-health:read')) bundle.connectedHealth = { observations: options.connectedObservations, sources: options.connectedSources };
  if (scopes.includes('preventive:read')) bundle.preventive = { records: options.preventiveRecords, reminders: options.preventiveReminders };
  if (scopes.includes('coaching:read')) bundle.coaching = { note: 'Phase 4 coaching is deterministic fitness guidance. An integration should consume an explicit exported snapshot rather than silently invoking hidden recommendations.' };
  return bundle;
}

export function integrationBundleContainsOnlyScopes(bundle: IntegrationBundle) {
  if (bundle.training && !bundle.scopes.includes('training:read')) return false;
  if (bundle.connectedHealth && !bundle.scopes.includes('connected-health:read')) return false;
  if (bundle.preventive && !bundle.scopes.includes('preventive:read')) return false;
  if (bundle.coaching && !bundle.scopes.includes('coaching:read')) return false;
  return true;
}

export interface HumanHealthIntegrationHost {
  describe(): Promise<{ name: string; supportedScopes: IntegrationScope[] }>;
  share(bundle: IntegrationBundle): Promise<{ accepted: boolean; receipt?: string; message?: string }>;
}

declare global {
  interface Window {
    HumanHealthIntegrationHost?: HumanHealthIntegrationHost;
  }
}

export function getIntegrationHost(): HumanHealthIntegrationHost | null {
  if (typeof window === 'undefined') return null;
  return window.HumanHealthIntegrationHost || null;
}

/**
 * This call performs an external share and therefore must only be invoked from
 * an explicit user action after the UI has shown the selected scopes.
 */
export async function shareIntegrationBundle(bundle: IntegrationBundle) {
  if (!integrationBundleContainsOnlyScopes(bundle)) throw new Error('Integration bundle contains data outside its declared scopes.');
  const host = getIntegrationHost();
  if (!host) throw new Error('No Human Health integration host is connected.');
  const description = await host.describe();
  const unsupported = bundle.scopes.filter(scope => !description.supportedScopes.includes(scope));
  if (unsupported.length) throw new Error(`Connected integration does not support scope(s): ${unsupported.join(', ')}.`);
  return host.share(bundle);
}
