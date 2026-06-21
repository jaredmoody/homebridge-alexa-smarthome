import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { FanState, isSpeedRangeFeature } from '../domain/alexa/fan';
import {
  RangeFeature,
  ToggleFeature,
} from '../domain/alexa/save-device-capabilities';
import * as mapper from '../mapper/fan-mapper';
import BaseAccessory from './base-accessory';

export default class FanAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Fanv2) ||
      this.platformAcc.addService(this.Service.Fanv2, this.device.displayName);

    this.service
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    pipe(
      Object.values(this.rangeFeatures),
      A.findFirst(({ rangeName }) => isSpeedRangeFeature(rangeName)),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.Characteristic.RotationSpeed)
          .onGet(this.handleSpeedGet.bind(this, asset))
          .onSet(this.handleSpeedSet.bind(this, asset));
      }),
    );

    pipe(
      O.fromNullable(Object.values(this.toggleFeatures)[0]),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.Characteristic.RotationDirection)
          .onGet(this.handleDirectionGet.bind(this, asset))
          .onSet(this.handleDirectionSet.bind(this, asset));
      }),
    );
  }

  async handleActiveGet(): Promise<boolean> {
    const determinePowerState = flow(
      A.findFirst<FanState>(({ featureName }) => featureName === 'power'),
      O.tap(({ value }) =>
        O.of(this.logWithContext('debug', `Get power result: ${value}`)),
      ),
      O.map(({ value }) => value === 'ON'),
    );

    return pipe(
      this.getStateGraphQl(determinePowerState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get power', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleActiveSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set power: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const action = mapper.mapHomeKitPowerToAlexaAction(
      value,
      this.Characteristic,
    );
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'power',
        action,
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set power', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: mapper.mapHomeKitPowerToAlexaValue(
              value,
              this.Characteristic,
            ),
            featureName: 'power',
          });
        },
      ),
    )();
  }

  async handleSpeedGet(asset: RangeFeature): Promise<number> {
    const determineSpeed = flow(
      A.findFirst<FanState>(
        ({ featureName, instance }) =>
          featureName === 'range' && asset.instance === instance,
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get speed result: ${s}`)),
      ),
      O.map((value) => mapper.mapAlexaSpeedToHomeKit(value)),
    );

    return pipe(
      this.getStateGraphQl(determineSpeed),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get speed', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleSpeedSet(
    asset: RangeFeature,
    value: CharacteristicValue,
  ): Promise<void> {
    this.logWithContext('debug', `Triggered set speed: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const alexaValue = mapper.mapHomeKitSpeedToAlexaValue(value);
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'range',
        'setRangeValue',
        { rangeValue: alexaValue },
        asset.instance,
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set speed', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: alexaValue,
            featureName: 'range',
            instance: asset.instance,
          });
        },
      ),
    )();
  }

  async handleDirectionGet(asset: ToggleFeature): Promise<number> {
    const determineDirection = flow(
      A.findFirst<FanState>(
        ({ featureName, instance }) =>
          featureName === 'toggle' && asset.instance === instance,
      ),
      O.tap(({ value }) =>
        O.of(this.logWithContext('debug', `Get direction result: ${value}`)),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaDirectionToHomeKit(value, this.Characteristic),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineDirection),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get direction', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleDirectionSet(
    asset: ToggleFeature,
    value: CharacteristicValue,
  ): Promise<void> {
    this.logWithContext('debug', `Triggered set direction: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const action = mapper.mapHomeKitDirectionToAlexaAction(
      value,
      this.Characteristic,
    );
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'toggle',
        action,
        {},
        asset.instance,
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set direction', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: mapper.mapHomeKitDirectionToAlexaValue(
              value,
              this.Characteristic,
            ),
            featureName: 'toggle',
            instance: asset.instance,
          });
        },
      ),
    )();
  }
}
