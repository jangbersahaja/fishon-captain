/**
 * Captain Documents Feature Module
 * Barrel exports for clean imports
 */

// Types
export * from "./types";

// Hooks
export { useDocumentUpload } from "./hooks/useDocumentUpload";

// Components
export { AdditionalDocumentsSection } from "./components/AdditionalDocumentsSection";
export { BankingSection } from "./components/BankingSection";
export { GovernmentIdSection } from "./components/GovernmentIdSection";
export { ProfessionalLicensesSection } from "./components/ProfessionalLicensesSection";

// UI Components
export * from "./components/ui";

// API
export * from "./server/documents-api";
