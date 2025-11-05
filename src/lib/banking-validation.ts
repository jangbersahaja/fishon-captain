/**
 * Banking validation utilities for Malaysian banks and international formats
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Malaysian bank account number patterns
 * Different banks have different formats
 * Updated to accept realistic ranges based on actual account numbers
 */
const MALAYSIAN_BANK_PATTERNS: Record<string, RegExp> = {
  // Maybank: 12-14 digits (older accounts may have 12)
  maybank: /^\d{12,14}$/,
  // CIMB: 10-14 digits (current and savings accounts)
  cimb: /^\d{10,14}$/,
  "cimb bank": /^\d{10,14}$/,
  // Public Bank: 10-12 digits
  "public bank": /^\d{10,12}$/,
  // Hong Leong Bank: 11-16 digits
  "hong leong": /^\d{11,16}$/,
  "hong leong bank": /^\d{11,16}$/,
  // RHB Bank: 12-14 digits
  rhb: /^\d{12,14}$/,
  "rhb bank": /^\d{12,14}$/,
  // AmBank: 12-16 digits
  ambank: /^\d{12,16}$/,
  // Bank Islam: 12-14 digits
  "bank islam": /^\d{12,14}$/,
  // OCBC: 10-12 digits
  ocbc: /^\d{10,12}$/,
  "ocbc bank": /^\d{10,12}$/,
  // HSBC: 9-12 digits
  hsbc: /^\d{9,12}$/,
  "hsbc bank": /^\d{9,12}$/,
  "hsbc bank malaysia": /^\d{9,12}$/,
  // Standard Chartered: 10-16 digits
  "standard chartered": /^\d{10,16}$/,
  "standard chartered bank": /^\d{10,16}$/,
  // Affin Bank: 12-14 digits
  "affin bank": /^\d{12,14}$/,
  // Alliance Bank: 12-15 digits
  "alliance bank": /^\d{12,15}$/,
  // Bank Rakyat: 12-14 digits
  "bank rakyat": /^\d{12,14}$/,
  // Bank Muamalat: 12-14 digits
  "bank muamalat": /^\d{12,14}$/,
  // BSN (Bank Simpanan Nasional): 12-14 digits
  bsn: /^\d{12,14}$/,
  "bank simpanan nasional": /^\d{12,14}$/,
  "bank simpanan nasional (bsn)": /^\d{12,14}$/,
  // UOB: 10-12 digits
  uob: /^\d{10,12}$/,
  "united overseas bank": /^\d{10,12}$/,
  "united overseas bank (uob)": /^\d{10,12}$/,
  // Default: 8-20 digits for other banks
  default: /^\d{8,20}$/,
};

/**
 * Validate Malaysian bank account number
 */
export function validateBankAccountNumber(
  accountNumber: string,
  bankName?: string
): ValidationResult {
  if (!accountNumber || !accountNumber.trim()) {
    return { valid: false, error: "Account number is required" };
  }

  // Remove spaces and dashes
  const cleaned = accountNumber.replace(/[\s-]/g, "");

  // Must contain only digits
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: "Account number must contain only digits" };
  }

  // Check length
  if (cleaned.length < 8) {
    return {
      valid: false,
      error: "Account number is too short (minimum 8 digits)",
    };
  }

  if (cleaned.length > 20) {
    return {
      valid: false,
      error: "Account number is too long (maximum 20 digits)",
    };
  }

  // Bank-specific validation if bank name is provided
  if (bankName) {
    const bankKey = bankName.toLowerCase();
    const pattern =
      MALAYSIAN_BANK_PATTERNS[bankKey] || MALAYSIAN_BANK_PATTERNS.default;

    if (!pattern.test(cleaned)) {
      return {
        valid: false,
        error: `Invalid account number format for ${bankName}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate SWIFT/BIC code format
 * Format: 8 or 11 characters (4 bank code + 2 country + 2 location + optional 3 branch)
 */
export function validateSwiftCode(swiftCode: string): ValidationResult {
  if (!swiftCode || !swiftCode.trim()) {
    return { valid: true }; // Optional field
  }

  const cleaned = swiftCode.trim().toUpperCase();

  // SWIFT code pattern: 4 letters (bank) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)
  const swiftPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

  if (!swiftPattern.test(cleaned)) {
    return {
      valid: false,
      error: "Invalid SWIFT/BIC code format (e.g., MBBEMYKL or MBBEMYKLXXX)",
    };
  }

  return { valid: true };
}

/**
 * Validate account holder name
 */
export function validateAccountHolderName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: "Account holder name is required" };
  }

  const trimmed = name.trim();

  // Minimum length
  if (trimmed.length < 3) {
    return { valid: false, error: "Name is too short (minimum 3 characters)" };
  }

  // Maximum length
  if (trimmed.length > 100) {
    return { valid: false, error: "Name is too long (maximum 100 characters)" };
  }

  // Should contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: "Name must contain at least one letter" };
  }

  // Only letters, spaces, hyphens, apostrophes, and dots allowed
  if (!/^[a-zA-Z\s\-'.]+$/.test(trimmed)) {
    return {
      valid: false,
      error:
        "Name can only contain letters, spaces, hyphens, apostrophes, and dots",
    };
  }

  return { valid: true };
}

/**
 * Validate bank name
 */
export function validateBankName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: "Bank name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Bank name is too short" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Bank name is too long" };
  }

  return { valid: true };
}

/**
 * List of major Malaysian banks for autocomplete/suggestions
 */
export const MALAYSIAN_BANKS = [
  "Affin Bank",
  "Alliance Bank",
  "AmBank",
  "Bank Islam",
  "Bank Muamalat",
  "Bank Rakyat",
  "Bank Simpanan Nasional (BSN)",
  "CIMB Bank",
  "Hong Leong Bank",
  "HSBC Bank Malaysia",
  "Maybank",
  "OCBC Bank",
  "Public Bank",
  "RHB Bank",
  "Standard Chartered Bank",
  "United Overseas Bank (UOB)",
] as const;

/**
 * Validate all banking information at once
 */
export function validateBankingInfo(data: {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankSwiftCode?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const bankNameResult = validateBankName(data.bankName);
  if (!bankNameResult.valid && bankNameResult.error) {
    errors.bankName = bankNameResult.error;
  }

  const accountNumberResult = validateBankAccountNumber(
    data.bankAccountNumber,
    data.bankName
  );
  if (!accountNumberResult.valid && accountNumberResult.error) {
    errors.bankAccountNumber = accountNumberResult.error;
  }

  const accountHolderResult = validateAccountHolderName(data.bankAccountHolder);
  if (!accountHolderResult.valid && accountHolderResult.error) {
    errors.bankAccountHolder = accountHolderResult.error;
  }

  if (data.bankSwiftCode) {
    const swiftResult = validateSwiftCode(data.bankSwiftCode);
    if (!swiftResult.valid && swiftResult.error) {
      errors.bankSwiftCode = swiftResult.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
