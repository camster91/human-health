import { NativeHealthBridge } from './types';

declare global {
  interface Window {
    HumanHealthNative?: {
      healthConnect?: NativeHealthBridge;
      appleHealth?: NativeHealthBridge;
    };
  }
}

export function getNativeHealthBridge(kind: 'healthConnect' | 'appleHealth') {
  if (typeof window === 'undefined') return undefined;
  return window.HumanHealthNative?.[kind];
}
