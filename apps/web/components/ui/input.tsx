import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Input ───────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-10 px-3 text-sm bg-surface border rounded-3 text-fg",
        "placeholder:text-fg-4",
        "transition-colors outline-none",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        hasError
          ? "border-danger focus:border-danger focus:ring-danger/20"
          : "border-border hover:border-border-2",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ─── Select ──────────────────────────────────────────────────────────────────

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full h-10 px-3 text-sm bg-surface border rounded-3 text-fg",
        "transition-colors outline-none appearance-none cursor-pointer",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        hasError
          ? "border-danger focus:border-danger focus:ring-danger/20"
          : "border-border hover:border-border-2",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ─── Textarea ────────────────────────────────────────────────────────────────

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }>(
  ({ className, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2.5 text-sm bg-surface border rounded-3 text-fg",
        "placeholder:text-fg-4 resize-y min-h-[80px]",
        "transition-colors outline-none",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        hasError
          ? "border-danger focus:border-danger focus:ring-danger/20"
          : "border-border hover:border-border-2",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ─── Field (label + input + error) ───────────────────────────────────────────

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-fg-2 leading-none">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger leading-snug">{error}</p>}
      {!error && hint && <p className="text-xs text-fg-4 leading-snug">{hint}</p>}
    </div>
  );
}

export { Input, Select, Textarea, Field };
