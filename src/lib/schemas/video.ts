// DEPRECATED: Moved to @fishon/schemas package
// Import from @fishon/schemas instead for consistency
export {
  ProcessStatusEnum,
  CreateUploadSchema,
  FinishFormSchema,
  TranscodePayloadSchema,
  ListQuerySchema,
  validateThumbFile,
  type ProcessStatus,
} from "@fishon/schemas";

/**
 * Supported video file extensions by category
 * Used for fallback validation when MIME type is unavailable or incorrect
 */
const SUPPORTED_VIDEO_EXTENSIONS = [
  // Modern web formats
  "mp4", "webm", "ogg",
  // Apple formats
  "mov", "m4v", "m4p",
  // Mobile formats (Android)
  "3gp", "3gpp",
  // Legacy/Desktop formats
  "avi", "mkv", "flv", "wmv",
  // MPEG variants
  "mpg", "mpeg", "mpe", "mpv", "m2v",
  // Transport streams
  "m2ts", "mts"
];

/**
 * Pre-compiled regex for video file extension validation
 * Cached for performance to avoid recompilation on every call
 */
const VIDEO_EXTENSION_REGEX = new RegExp(
  `\\.(${SUPPORTED_VIDEO_EXTENSIONS.join("|")})$`,
  "i"
);

/**
 * Validate video file type
 * Mobile-friendly validation that checks both MIME type and file extension
 * 
 * @param file - File to validate
 * @returns true if valid video file, false otherwise
 * 
 * @remarks
 * Mobile devices (especially iOS) may not set proper MIME types or may use:
 * - Empty string
 * - "application/octet-stream"
 * - Incorrect MIME types (e.g., "audio/mpeg" for .mp4 files)
 * - Unexpected video MIME types like "video/quicktime" for .mov files
 * 
 * Strategy:
 * 1. If MIME type is video/*, accept immediately (most reliable case)
 * 2. Always check file extension as fallback (handles empty/wrong/generic MIME types)
 * 
 * This intentionally allows files with wrong MIME types if they have valid video extensions,
 * as mobile browsers frequently misreport MIME types.
 * 
 * NOTE: This function is temporarily duplicated here because it's not exported from
 * @fishon/schemas barrel export. Once added to the package exports, this should be removed.
 */
export function isValidVideoFile(file: File): boolean {
  // Fast path: If MIME type is valid video type, accept immediately
  if (file.type && file.type.startsWith("video/")) {
    return true;
  }
  
  // Fallback: Check file extension for common video formats
  // This handles: empty MIME, application/octet-stream, wrong MIME types
  return VIDEO_EXTENSION_REGEX.test(file.name);
}
