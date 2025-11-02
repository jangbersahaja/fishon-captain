/**
 * Notification Sound Utility
 *
 * Handles notification sounds with user preference support.
 * Uses Web Audio API for better control and fallback to HTML5 Audio.
 */

let audioContext: AudioContext | null = null;
let soundEnabled = true;

/**
 * Initialize audio context (must be called after user interaction)
 */
export function initAudioContext() {
  if (typeof window === "undefined") return;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        // @ts-expect-error - webkitAudioContext is a legacy API
        window.webkitAudioContext)();
    }
  } catch (error) {
    console.warn("Failed to initialize audio context:", error);
  }
}

/**
 * Play notification sound
 * Uses a simple synthesized beep (no external audio files needed)
 */
export function playNotificationSound() {
  if (typeof window === "undefined" || !soundEnabled) return;

  try {
    // Initialize on first play
    if (!audioContext) {
      initAudioContext();
    }

    if (!audioContext) {
      // Fallback to simple beep
      playBeepFallback();
      return;
    }

    // Create a simple pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant notification tone (G note, 784 Hz)
    oscillator.frequency.value = 784;
    oscillator.type = "sine";

    // Fade in and out
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01); // Fade in
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.08); // Hold
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15); // Fade out

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
    playBeepFallback();
  }
}

/**
 * Fallback beep using Data URI
 */
function playBeepFallback() {
  try {
    // Short beep as data URI (very small, no external file needed)
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYDGmi77eedTRAMUKfj8LZjHAY4ktjyz3ovBSx+zPLiizgEHnTD8N+VRAD"
    );
    audio.volume = 0.1;
    audio.play().catch(() => {
      // Silently fail if autoplay is blocked
    });
  } catch {
    // Silently fail
  }
}

/**
 * Enable notification sounds
 */
export function enableNotificationSound() {
  soundEnabled = true;
  if (typeof window !== "undefined") {
    localStorage.setItem("notification-sound-enabled", "true");
  }
}

/**
 * Disable notification sounds
 */
export function disableNotificationSound() {
  soundEnabled = false;
  if (typeof window !== "undefined") {
    localStorage.setItem("notification-sound-enabled", "false");
  }
}

/**
 * Check if notification sounds are enabled
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;

  const stored = localStorage.getItem("notification-sound-enabled");
  if (stored !== null) {
    soundEnabled = stored === "true";
  }
  return soundEnabled;
}

/**
 * Toggle notification sound
 */
export function toggleNotificationSound(): boolean {
  const enabled = !soundEnabled;
  if (enabled) {
    enableNotificationSound();
  } else {
    disableNotificationSound();
  }
  return enabled;
}
