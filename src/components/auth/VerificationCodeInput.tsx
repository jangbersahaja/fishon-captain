/**
 * VerificationCodeInput Component
 * Individual digit input boxes for OTP/MFA codes
 * Supports auto-focus, paste, and keyboard navigation
 */

"use client";

import { cn } from "@/lib/utils";
import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";

interface VerificationCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function VerificationCodeInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  className,
}: VerificationCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Focus input when value changes (for controlled component)
  useEffect(() => {
    const currentLength = value.length;
    if (currentLength < length && inputRefs.current[currentLength]) {
      inputRefs.current[currentLength].focus();
    }
  }, [value, length]);

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;

    // Only allow digits
    const sanitized = digit.replace(/[^0-9]/g, "");
    if (sanitized.length === 0 && digit.length > 0) return;

    const newValue = value.split("");
    newValue[index] = sanitized[0] || "";
    const updatedValue = newValue.join("").slice(0, length);
    onChange(updatedValue);

    // Auto-focus next input
    if (sanitized.length > 0 && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Handle backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      const newValue = value.split("");

      if (newValue[index]) {
        // Clear current digit
        newValue[index] = "";
        onChange(newValue.join(""));
      } else if (index > 0) {
        // Move to previous input and clear it
        newValue[index - 1] = "";
        onChange(newValue.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle left arrow
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow
    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    // Handle home key
    if (e.key === "Home") {
      e.preventDefault();
      inputRefs.current[0]?.focus();
    }

    // Handle end key
    if (e.key === "End") {
      e.preventDefault();
      inputRefs.current[length - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const digits = pastedData.replace(/[^0-9]/g, "").slice(0, length);

    if (digits.length > 0) {
      onChange(digits);
      // Focus the next empty input or last input
      const nextIndex = Math.min(digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select all text in input for easy replacement
    inputRefs.current[index]?.select();
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-2xl font-semibold",
            "border-2 rounded-lg",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            {
              "border-gray-300 focus:border-blue-500 focus:ring-blue-500":
                !error && !disabled,
              "border-red-500 focus:border-red-500 focus:ring-red-500": error,
              "bg-gray-100 cursor-not-allowed opacity-50": disabled,
              "bg-white": !disabled,
            }
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={error}
        />
      ))}
    </div>
  );
}
