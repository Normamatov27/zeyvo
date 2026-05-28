import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default:  "bg-surface-2 text-fg-2 border border-border",
        primary:  "bg-primary-soft text-primary border border-primary/20",
        success:  "bg-success-soft text-success border border-success/20",
        warning:  "bg-warning-soft text-warning border border-warning/20",
        danger:   "bg-danger-soft text-danger border border-danger/20",
        muted:    "bg-surface-3 text-fg-3 border border-transparent",
      },
      size: {
        sm: "h-5 px-2 text-[11px] rounded-1",
        md: "h-6 px-2.5 text-xs rounded-2",
        lg: "h-7 px-3 text-sm rounded-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
