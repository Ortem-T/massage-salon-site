import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "focus-ring flex min-h-12 w-full appearance-none rounded-lg border border-border/85 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm transition-colors hover:border-accent/50 aria-invalid:border-accent disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export { Select };
