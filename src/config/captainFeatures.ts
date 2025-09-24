export const captainFeatures = {
  media: true,
  bookings: false,
  calendar: false,
  reviews: false,
  messages: false,
  analytics: false,
  pricing: false,
  settings: true,
} as const;

export type CaptainFeatureKey = keyof typeof captainFeatures;

export function isCaptainFeatureEnabled(key: CaptainFeatureKey) {
  return !!captainFeatures[key];
}
