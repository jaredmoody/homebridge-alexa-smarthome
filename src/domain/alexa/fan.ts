import { CapabilityState, SupportedFeatures } from './index';

export interface FanState {
  featureName: keyof typeof FanFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
  instance?: CapabilityState['instance'];
}

export const FanFeatures = {
  power: 'power',
  range: 'range',
  toggle: 'toggle',
} as const;

// Guards against fans that also have temperature range controllers on the same endpoint.
const FAN_SPEED_RANGE_NAMES = ['speed', 'fan speed', 'wind speed', 'air speed'];

export const isSpeedRangeFeature = (rangeName: string): boolean =>
  FAN_SPEED_RANGE_NAMES.some((n) => rangeName.toLowerCase().includes(n));
