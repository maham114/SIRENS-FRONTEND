import type { OnboardingLocation, OnboardingRole } from '@/stores/onboardingStore';

export const ALLOWED_ONBOARDING_ROLES: OnboardingRole[] = ['citizen'];

export function isAllowedRole(role: string): role is OnboardingRole {
  return ALLOWED_ONBOARDING_ROLES.includes(role as OnboardingRole);
}

export function validateLocation(location: OnboardingLocation, label: string): string | null {
  if (!location.area.trim()) {
    return `Please enter your ${label} area name.`;
  }
  if (!location.coords) {
    return `Please pick your ${label} location on the map.`;
  }
  return null;
}

export function validateFrequentAreas(areas: OnboardingLocation[]): string | null {
  for (let i = 0; i < areas.length; i += 1) {
    const area = areas[i];
    const hasName = area.area.trim().length > 0;
    const hasCoords = Boolean(area.coords);

    if (!hasName && !hasCoords) {
      return `Remove empty frequent area ${i + 1} or fill it in.`;
    }
    if (!hasName) {
      return `Please enter a name for frequent area ${i + 1}.`;
    }
    if (!hasCoords) {
      return `Please pick a map location for frequent area ${i + 1}.`;
    }
  }
  return null;
}

export function validateOnboardingStep(input: {
  step: number;
  role: string;
  city: string;
  district: string;
  homeLocation: OnboardingLocation;
  workLocation: OnboardingLocation;
  frequentAreas: OnboardingLocation[];
}): string | null {
  switch (input.step) {
    case 1:
      return isAllowedRole(input.role) ? null : 'Please select a valid role.';
    case 2:
      return input.city.trim() && input.district.trim()
        ? null
        : 'Please enter both city and district.';
    case 3:
      return validateLocation(input.homeLocation, 'home');
    case 4:
      return validateLocation(input.workLocation, 'work');
    case 5:
      return validateFrequentAreas(input.frequentAreas);
    default:
      return null;
  }
}
