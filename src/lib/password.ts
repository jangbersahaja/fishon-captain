/**
 * Password validation and strength utilities
 * Enforces strong password requirements for user accounts
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong" | "very-strong";
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Validates a password against security requirements
 */
export function validatePassword(
  password: string,
  requirements: Partial<PasswordRequirements> = {}
): PasswordValidationResult {
  const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };
  const errors: string[] = [];

  if (password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters long`);
  }

  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (reqs.requireNumber && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    reqs.requireSpecial &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*...)"
    );
  }

  if (password.toLowerCase().includes("password")) {
    errors.push('Password cannot contain the word "password"');
  }

  if (/^(.)\1+$/.test(password)) {
    errors.push("Password cannot be a repeated character");
  }

  if (/^(012|123|234|345|456|567|678|789|890)/.test(password)) {
    errors.push("Password cannot contain sequential numbers");
  }

  if (
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
      password
    )
  ) {
    errors.push("Password cannot contain sequential letters");
  }

  let strength: PasswordValidationResult["strength"] = "weak";

  if (errors.length === 0) {
    let score = 0;

    if (password.length >= 16) score += 2;
    else if (password.length >= 12) score += 1;

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 1;

    if (score >= 6) strength = "very-strong";
    else if (score >= 4) strength = "strong";
    else if (score >= 2) strength = "medium";
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Checks if a new password matches any of the user's recent passwords
 */
export async function isPasswordReused(
  newPassword: string,
  previousPasswordHashes: string[]
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");

  for (const oldHash of previousPasswordHashes) {
    const matches = await bcrypt.compare(newPassword, oldHash);
    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a new password against user's password history
 */
export async function validatePasswordWithHistory(
  newPassword: string,
  previousPasswordHashes: string[],
  requirements: Partial<PasswordRequirements> = {}
): Promise<PasswordValidationResult> {
  const result = validatePassword(newPassword, requirements);

  if (!result.valid) {
    return result;
  }

  const isReused = await isPasswordReused(newPassword, previousPasswordHashes);

  if (isReused) {
    result.valid = false;
    result.errors.push(
      "This password was used recently. Please choose a different password."
    );
  }

  return result;
}
