// @ts-nocheck
/// <reference types="@citizenfx/client" />

import { config } from './utils';

export function setWeatherTime() {
  if (config.debug) console.log(`DEBUG: Setting Weather & Time`);
  SetRainLevel(0.0);
  SetWeatherTypePersist('EXTRASUNNY');
  SetWeatherTypeNow('EXTRASUNNY');
  SetWeatherTypeNowPersist('EXTRASUNNY');
  NetworkOverrideClockTime(18, 0, 0);
  NetworkOverrideClockMillisecondsPerGameMinute(1000000);
}

export function stopWeatherResource(): boolean {
  if (config.debug) console.log(`DEBUG: Stopping Weather Resource`);
  if (
    GetResourceState('qb-weathersync') == 'started' ||
    GetResourceState('qbx_weathersync') == 'started'
  ) {
    TriggerEvent('qb-weathersync:client:DisableSync');
    return true;
  } else if (GetResourceState('weathersync') == 'started') {
    TriggerEvent('weathersync:toggleSync');
    return true;
  } else if (GetResourceState('esx_wsync') == 'started') {
    SendNUIMessage({
      action: 'error',
      data: { type: 'weathersync' },
    });
    return false;
  } else if (GetResourceState('cd_easytime') == 'started') {
    TriggerEvent('cd_easytime:PauseSync', false);
    return true;
  } else if (
    GetResourceState('vSync') == 'started' ||
    GetResourceState('Renewed-Weathersync') == 'started'
  ) {
    TriggerEvent('vSync:toggle', false);
    return true;
  }
  return true;
}

export function startWeatherResource() {
  if (config.debug) console.log(`DEBUG: Starting Weather Resource again`);
  if (
    GetResourceState('qb-weathersync') == 'started' ||
    GetResourceState('qbx_weathersync') == 'started'
  ) {
    TriggerEvent('qb-weathersync:client:EnableSync');
  } else if (GetResourceState('weathersync') == 'started') {
    TriggerEvent('weathersync:toggleSync');
  } else if (GetResourceState('cd_easytime') == 'started') {
    TriggerEvent('cd_easytime:PauseSync', true);
  } else if (
    GetResourceState('vSync') == 'started' ||
    GetResourceState('Renewed-Weathersync') == 'started'
  ) {
    TriggerEvent('vSync:toggle', true);
  }
}
