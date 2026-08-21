import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        // Ausstattungsmerkmale (Konzept: neutral)
        default: "border border-border bg-muted text-foreground",
        // bestätigt/genehmigt → Success
        success: "bg-success-background text-success",
        // ausstehend → Warning
        warning: "bg-warning-background text-warning",
        // abgelehnt/storniert → Destructive
        destructive: "bg-destructive-background text-destructive",
        // eingecheckt → Primary
        primary: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
