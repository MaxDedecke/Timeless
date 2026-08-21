import * as React from "react";

import { cn } from "../../lib/utils";

/** Ladezustand in der Layoutform der Zielsicht (Konzept: keine freischwebenden Spinner). */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
