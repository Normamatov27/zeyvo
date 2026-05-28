"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Modal — standard centered dialog
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Widen to "lg" for forms or tables */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Show a destructive red header strip */
  destructive?: boolean;
}

const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  className,
  destructive,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2",
            "bg-surface border border-border rounded-4 shadow-4",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            sizeClass[size],
            className
          )}
        >
          {(title || description) && (
            <div
              className={cn(
                "flex items-start justify-between gap-4 px-5 py-4 border-b border-hairline",
                destructive && "border-b-danger/20"
              )}
            >
              <div className="flex-1 min-w-0">
                {title && (
                  <Dialog.Title
                    className={cn(
                      "text-base font-semibold leading-snug",
                      destructive ? "text-danger" : "text-fg"
                    )}
                  >
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

export const ModalContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 py-4", className)} {...props} />
  )
);
ModalContent.displayName = "ModalContent";

export const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-end gap-2 px-5 py-4 border-t border-hairline", className)} {...props} />
  )
);
ModalFooter.displayName = "ModalFooter";
