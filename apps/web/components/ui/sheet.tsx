"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Sheet — bottom drawer on mobile, right panel on desktop
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Default "bottom" slides up from bottom (mobile); "right" slides from right (desktop) */
  side?: "bottom" | "right";
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "bottom",
  className,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-surface border-border shadow-4",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            side === "bottom"
              ? cn(
                  "inset-x-0 bottom-0 rounded-t-5 border-t max-h-[85svh] overflow-y-auto",
                  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
                )
              : cn(
                  "inset-y-0 right-0 w-full max-w-md border-l",
                  "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
                ),
            className
          )}
        >
          {/* Drag handle (bottom sheet only) */}
          {side === "bottom" && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border-2 rounded-full" />
            </div>
          )}

          {(title || description) && (
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-hairline">
              <div className="flex-1 min-w-0">
                {title && (
                  <Dialog.Title className="text-base font-semibold text-fg leading-snug">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="mt-0.5 text-sm text-fg-3 leading-relaxed">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="flex-shrink-0 h-8 w-8 rounded-2 flex items-center justify-center text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 py-4", className)} {...props} />
  )
);
SheetContent.displayName = "SheetContent";

export const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 py-4 border-t border-hairline", className)} {...props} />
  )
);
SheetFooter.displayName = "SheetFooter";
