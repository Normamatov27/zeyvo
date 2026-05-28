"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Toast provider (place once in the layout) ───────────────────────────────

export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({ className }: { className?: string }) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 max-w-sm w-full",
        "sm:bottom-4 sm:right-4",
        className
      )}
    />
  );
}

// ─── Single toast ────────────────────────────────────────────────────────────

type ToastVariant = "default" | "success" | "warning" | "danger" | "info";

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** If provided, shows an Undo button that calls this */
  onUndo?: () => void;
  /** Auto-dismiss duration in ms (default 4 s; 7 s when undo present) */
  duration?: number;
  action?: React.ReactNode;
}

const ICONS: Record<ToastVariant, React.ElementType> = {
  default: Info,
  info:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger:  XCircle,
};

const STYLE: Record<ToastVariant, string> = {
  default: "border-border text-fg",
  info:    "border-primary/30 text-primary",
  success: "border-success/30 text-success",
  warning: "border-warning/30 text-warning",
  danger:  "border-danger/30 text-danger",
};

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  onUndo,
  duration,
  action,
}: ToastProps) {
  const Icon = ICONS[variant];
  const dur = duration ?? (onUndo ? 7000 : 4000);

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={dur}
      className={cn(
        "relative flex items-start gap-3 w-full rounded-3 border bg-surface shadow-3 px-4 py-3",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
        "data-[state=open]:slide-in-from-bottom-full data-[state=open]:sm:slide-in-from-bottom-full",
        STYLE[variant]
      )}
    >
      <Icon size={18} className="mt-0.5 flex-shrink-0" aria-hidden />

      <div className="flex-1 min-w-0">
        {title && (
          <ToastPrimitive.Title className="text-sm font-semibold text-fg leading-snug">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="mt-0.5 text-sm text-fg-3 leading-relaxed">
            {description}
          </ToastPrimitive.Description>
        )}
        {onUndo && (
          <ToastPrimitive.Action
            altText="Undo this action"
            asChild
          >
            <button
              onClick={onUndo}
              className="mt-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none"
            >
              Undo
            </button>
          </ToastPrimitive.Action>
        )}
        {action}
      </div>

      <ToastPrimitive.Close asChild>
        <button
          className="flex-shrink-0 h-6 w-6 rounded-1 flex items-center justify-center text-fg-4 hover:text-fg hover:bg-surface-2 transition-colors focus-visible:outline-none"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────

type ToastData = Omit<ToastProps, "open" | "onOpenChange"> & { id: string };

interface ToastStore {
  toasts: ToastData[];
  add: (t: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
}

const listeners: Array<(store: ToastStore) => void> = [];
let store: ToastStore = {
  toasts: [],
  add(t) {
    const id = Math.random().toString(36).slice(2);
    store = { ...store, toasts: [...store.toasts, { ...t, id }] };
    listeners.forEach((l) => l(store));
    return id;
  },
  dismiss(id) {
    store = { ...store, toasts: store.toasts.filter((t) => t.id !== id) };
    listeners.forEach((l) => l(store));
  },
};

export function useToast() {
  const [state, setState] = React.useState(store);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return {
    toasts: state.toasts,
    toast: store.add,
    dismiss: store.dismiss,
  };
}

// Imperative helper — call from anywhere
export const toast = {
  show: (t: Omit<ToastData, "id">) => store.add(t),
  success: (title: string, opts?: Partial<Omit<ToastData, "id" | "variant">>) =>
    store.add({ title, variant: "success", ...opts }),
  danger: (title: string, opts?: Partial<Omit<ToastData, "id" | "variant">>) =>
    store.add({ title, variant: "danger", ...opts }),
  warning: (title: string, opts?: Partial<Omit<ToastData, "id" | "variant">>) =>
    store.add({ title, variant: "warning", ...opts }),
  info: (title: string, opts?: Partial<Omit<ToastData, "id" | "variant">>) =>
    store.add({ title, variant: "info", ...opts }),
};

// ─── Toaster (renders all active toasts) ─────────────────────────────────────

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          {...t}
          open
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
