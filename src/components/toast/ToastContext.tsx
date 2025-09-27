"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Toast } from "./ToastTypes";

interface AnchorRegistration {
  id: string;
  getHeight: () => number;
}

interface ToastContextValue {
  push: (t: Partial<Omit<Toast, "createdAt">> & { id?: string }) => string; // returns id
  dismiss: (id: string) => void;
  update: (id: string, patch: Partial<Omit<Toast, "id">>) => void;
  registerBottomAnchor: (id: string, getHeight: () => number) => () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used within ToastProvider");
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultOffset?: number; // px
}

export const ToastProvider: React.FC<ProviderProps> = ({
  children,
  maxToasts = 3,
  defaultOffset = 16,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const anchorsRef = useRef<AnchorRegistration[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const computeDynamicOffset = () => {
    if (!anchorsRef.current.length) return defaultOffset;
    // take max height
    const h = Math.max(...anchorsRef.current.map((a) => a.getHeight()));
    return h + 24; // add breathing space
  };

  const push: ToastContextValue["push"] = useCallback(
    (partial) => {
      const id =
        partial.id ||
        `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => {
        // replacement logic
        const existingIdx = prev.findIndex((t) => t.id === id);
        if (
          existingIdx !== -1 &&
          (partial.replace || prev[existingIdx].type === "progress")
        ) {
          const next: Toast = {
            ...prev[existingIdx],
            ...partial,
            id,
            createdAt: prev[existingIdx].createdAt,
          } as Toast;
          return prev.map((t) => (t.id === id ? next : t));
        }
        const toast: Toast = {
          id,
          type: (partial.type as Toast["type"]) || "info",
          message: partial.message || "",
          createdAt: Date.now(),
          autoDismiss: partial.autoDismiss,
          sticky: partial.sticky,
          actions: partial.actions,
          replace: partial.replace,
        };
        // de-dupe identical success quickly repeating
        if (toast.type === "success") {
          const last = prev[0];
          if (
            last &&
            last.type === "success" &&
            last.message === toast.message &&
            Date.now() - last.createdAt < 1200
          ) {
            return prev; // ignore duplicate
          }
        }
        let next = [toast, ...prev];
        if (next.length > maxToasts) next = next.slice(0, maxToasts);
        return next;
      });
      return id;
    },
    [maxToasts]
  );

  const dismiss: ToastContextValue["dismiss"] = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const update: ToastContextValue["update"] = useCallback((id, patch) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  const registerBottomAnchor: ToastContextValue["registerBottomAnchor"] =
    useCallback((id, getHeight) => {
      anchorsRef.current.push({ id, getHeight });
      return () => {
        anchorsRef.current = anchorsRef.current.filter((a) => a.id !== id);
      };
    }, []);

  // auto dismissal effect
  useEffect(() => {
    const timers = toasts.map((t) => {
      if (t.sticky || !t.autoDismiss) return null;
      const remaining = t.autoDismiss - (Date.now() - t.createdAt);
      if (remaining <= 0) {
        // immediate flush
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
        return null;
      }
      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, remaining);
      return timeout;
    });
    return () => {
      timers.forEach((t) => t && clearTimeout(t));
    };
  }, [toasts]);

  const offset = computeDynamicOffset();

  return (
    <ToastContext.Provider
      value={{ push, dismiss, update, registerBottomAnchor }}
    >
      {children}
      {mounted &&
        createPortal(
          <ToastViewport
            toasts={toasts}
            dismiss={dismiss}
            dynamicOffset={offset}
          />,
          document.body
        )}
    </ToastContext.Provider>
  );
};

// Separate file would be fine; inline for brevity
interface ViewportProps {
  toasts: Toast[];
  dismiss: (id: string) => void;
  dynamicOffset: number;
}

const ToastViewport: React.FC<ViewportProps> = ({
  toasts,
  dismiss,
  dynamicOffset,
}) => {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[60] flex w-full max-w-[380px] -translate-x-1/2 flex-col gap-2 px-4"
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${dynamicOffset}px)`,
      }}
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
};

const typeStyles: Record<string, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-slate-800 text-white",
  progress: "bg-slate-700 text-white",
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  const { type, message, actions } = toast;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`pointer-events-auto relative flex w-full items-start overflow-hidden rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ring-black/10 ${typeStyles[type]}`}
      data-toast-type={type}
    >
      <div className="flex-1 pr-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-block text-base">
            {type === "success" && "✓"}
            {type === "error" && "⚠"}
            {type === "info" && "ℹ"}
            {type === "progress" && "…"}
          </span>
          <p className="leading-snug">{message}</p>
        </div>
        {actions && actions.length > 0 && (
          <div className="mt-2 flex gap-3">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.onClick();
                }}
                className="rounded border border-white/30 px-2 py-1 text-[11px] font-medium backdrop-blur transition hover:bg-white/10"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {type !== "progress" && !toast.sticky && (
        <button
          onClick={onDismiss}
          className="ml-auto inline-flex shrink-0 rounded p-1 text-white/70 transition hover:text-white"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
      {type === "progress" && (
        <span className="ml-auto animate-pulse text-xs text-white/70">
          Saving
        </span>
      )}
      {/* Animation classes (basic) */}
      <style jsx>{`
        div[data-toast-type] {
          opacity: 0;
          transform: translateY(12px);
          animation: toast-in 200ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          div[data-toast-type] {
            transform: none;
            animation: fade-in 160ms linear forwards;
          }
        }
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
