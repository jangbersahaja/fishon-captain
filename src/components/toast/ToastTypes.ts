export type ToastType = "success" | "error" | "info" | "progress";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string; // stable id to allow replacement
  type: ToastType;
  message: string;
  createdAt: number;
  autoDismiss?: number; // ms
  sticky?: boolean; // if true, never auto dismiss
  actions?: ToastAction[];
  replace?: boolean; // if true, newer with same id replaces immediately
}
