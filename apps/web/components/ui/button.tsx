"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // base
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg hover:bg-primary-2 active:scale-[0.98]",
        success:
          "bg-success text-fg-inv hover:opacity-90 active:scale-[0.98]",
        danger:
          "bg-danger text-fg-inv hover:opacity-90 active:scale-[0.98]",
        ghost:
          "bg-transparent text-fg-2 hover:bg-surface-2 hover:text-fg active:bg-surface-3",
        outline:
          "border border-border text-fg bg-transparent hover:bg-surface-2 active:bg-surface-3",
        muted:
          "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg",
      },
      size: {
        sm:    "h-8  px-3  text-xs  rounded-2",
        md:    "h-10 px-4  text-sm  rounded-3",
        lg:    "h-11 px-5  text-sm  rounded-3",
        touch: "h-14 px-6  text-base rounded-3",
        icon:  "h-10 w-10         rounded-3",
        "icon-sm": "h-8 w-8       rounded-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
