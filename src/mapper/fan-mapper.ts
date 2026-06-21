import type { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState, SupportedActionsType } from '../domain/alexa';
import { constant } from 'fp-ts/lib/function';

export const mapHomeKitPowerToAlexaAction = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match<CapabilityState['value'], SupportedActionsType>(value)
    .with(characteristic.Active.ACTIVE, constant('turnOn'))
    .otherwise(constant('turnOff'));

export const mapHomeKitPowerToAlexaValue = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with(characteristic.Active.ACTIVE, constant('ON'))
    .otherwise(constant('OFF'));

export const mapAlexaSpeedToHomeKit = (
  value: CapabilityState['value'],
  minValue = 0,
  maxValue = 100,
): number => {
  if (typeof value !== 'number') return 0;
  if (maxValue === minValue) return 0;
  return Math.round(((value - minValue) / (maxValue - minValue)) * 100);
};

export const mapHomeKitSpeedToAlexaValue = (
  value: number,
  minValue = 0,
  maxValue = 100,
): number => {
  return Math.round(minValue + (value / 100) * (maxValue - minValue));
};

export const mapAlexaDirectionToHomeKit = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
): number =>
  value === 'ON'
    ? characteristic.RotationDirection.COUNTER_CLOCKWISE
    : characteristic.RotationDirection.CLOCKWISE;

export const mapHomeKitDirectionToAlexaAction = (
  value: number,
  characteristic: typeof Characteristic,
): SupportedActionsType =>
  value === characteristic.RotationDirection.COUNTER_CLOCKWISE
    ? 'turnOn'
    : 'turnOff';

export const mapHomeKitDirectionToAlexaValue = (
  value: number,
  characteristic: typeof Characteristic,
): 'ON' | 'OFF' =>
  value === characteristic.RotationDirection.COUNTER_CLOCKWISE ? 'ON' : 'OFF';
