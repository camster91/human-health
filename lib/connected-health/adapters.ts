import { getNativeHealthBridge } from './bridge';
import { mapNativeRecord } from './native-mapping';
import { AdapterAvailability, ConnectedMetric, HealthDataAdapter, HealthProvider, HealthSyncBatch, HealthSyncRequest } from './types';

const supported: ConnectedMetric[] = ['steps', 'sleep-duration', 'sleep-stage', 'heart-rate', 'resting-heart-rate', 'cardio-fitness', 'distance', 'active-energy', 'workout-duration', 'water', 'protein', 'fibre'];

class NativeBridgeAdapter implements HealthDataAdapter {
  constructor(
    readonly provider: Extract<HealthProvider, 'health-connect' | 'apple-health'>,
    readonly sourceId: string,
    readonly displayName: string,
    private readonly bridgeKey: 'healthConnect' | 'appleHealth',
  ) {}

  readonly supportedMetrics = supported;

  async availability(): Promise<AdapterAvailability> {
    const bridge = getNativeHealthBridge(this.bridgeKey);
    if (!bridge) return { available: false, permissionRequired: false, grantedMetrics: [], reason: `${this.displayName} requires a compatible native app host. This browser-only PWA can use local file import instead.` };
    try {
      const state = await bridge.status();
      const grantedMetrics = (state.grantedMetrics || []).filter(metric => this.supportedMetrics.includes(metric));
      return { available: state.available, permissionRequired: state.available && grantedMetrics.length === 0, grantedMetrics, reason: state.reason };
    } catch (error) {
      return { available: false, permissionRequired: false, grantedMetrics: [], reason: error instanceof Error ? error.message : `${this.displayName} status failed.` };
    }
  }

  async requestPermissions(metrics: ConnectedMetric[]): Promise<AdapterAvailability> {
    const bridge = getNativeHealthBridge(this.bridgeKey);
    if (!bridge) return this.availability();
    const requested = metrics.filter(metric => this.supportedMetrics.includes(metric));
    try {
      const result = await bridge.requestPermissions(requested);
      const grantedMetrics = result.grantedMetrics.filter(metric => requested.includes(metric));
      return { available: true, permissionRequired: grantedMetrics.length === 0, grantedMetrics, reason: result.reason };
    } catch (error) {
      return { available: true, permissionRequired: true, grantedMetrics: [], reason: error instanceof Error ? error.message : 'Permission request failed.' };
    }
  }

  async read(request: HealthSyncRequest): Promise<HealthSyncBatch> {
    const bridge = getNativeHealthBridge(this.bridgeKey);
    if (!bridge) throw new Error(`${this.displayName} native bridge is unavailable.`);
    const response = await bridge.read({ ...request, metrics: request.metrics.filter(metric => this.supportedMetrics.includes(metric)) });
    return {
      observations: response.records.flatMap(record => mapNativeRecord(this.provider, this.sourceId, record)),
      deletedExternalIds: response.deletedIds || [],
      nextCursor: response.nextCursor,
      complete: response.complete ?? true,
      warnings: response.warnings,
    };
  }

  async disconnect() {
    const bridge = getNativeHealthBridge(this.bridgeKey);
    await bridge?.disconnect?.();
  }
}

export function createHealthConnectAdapter() {
  return new NativeBridgeAdapter('health-connect', 'native:health-connect', 'Health Connect', 'healthConnect');
}

export function createAppleHealthAdapter() {
  return new NativeBridgeAdapter('apple-health', 'native:apple-health', 'Apple Health', 'appleHealth');
}
