import type { Coordinates, LocationTarget, OnboardingLocation } from '@/stores/onboardingStore';

export function parseLocationTarget(target?: string): LocationTarget | null {
  if (target === 'home') return { kind: 'home' };
  if (target === 'work') return { kind: 'work' };
  if (target?.startsWith('frequent-')) {
    const index = Number(target.split('-')[1]);
    return Number.isInteger(index) && index >= 0 ? { kind: 'frequent', index } : null;
  }
  return null;
}

export function locationTargetToParam(target: LocationTarget) {
  return target.kind === 'frequent' ? `frequent-${target.index}` : target.kind;
}

export function normalizeCoords(value: unknown): Coordinates | null {
  if (!value) return null;
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return { latitude: value[0], longitude: value[1] };
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).latitude === 'number' &&
    typeof (value as any).longitude === 'number'
  ) {
    return { latitude: (value as any).latitude, longitude: (value as any).longitude };
  }
  return null;
}

export function normalizeLocation(value: unknown): OnboardingLocation {
  const location = typeof value === 'object' && value !== null ? value as any : {};
  return {
    area: typeof location.area === 'string' ? location.area : '',
    coords: normalizeCoords(location.coords),
  };
}

export function toBackendLocation(location: OnboardingLocation) {
  return {
    area: location.area.trim(),
    coords: location.coords
      ? [location.coords.latitude, location.coords.longitude]
      : null,
  };
}
