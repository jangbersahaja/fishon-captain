// Media processing configuration constants
export const SMALL_IMAGE_MAX_BYTES = 200_000; // 200KB threshold to skip resize
export const IMAGE_MAX_DIMENSION = 1600; // future: if we probe dimensions
export const ORIGINAL_VIDEO_PREFIX = "captains"; // base prefix, we add /<userId>/media/original/
export const PENDING_POLL_INTERVAL_MS = 3000;
export const PENDING_POLL_BACKOFF_FACTOR = 1.5;
export const MAX_USER_PENDING_MEDIA = 200; // safety limit
// Max short-form captain video size (bytes). Adjusted to 150MB to match client-side validation.
// This allows high bitrate 30s clips while preventing huge uploads.
// Client-side VideoTrimModal enforces this limit before upload.
export const MAX_SHORT_VIDEO_BYTES = 500 * 1024 * 1024;
