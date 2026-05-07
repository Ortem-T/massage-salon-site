import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "focus-ring flex min-h-13 w-full appearance-none rounded-xl border border-border/75 bg-background/62 px-4 py-3 pr-11 text-[0.95rem] text-foreground shadow-[inset_0_1px_0_rgb(255_250_240/0.7)] transition-all duration-300 hover:border-accent/45 hover:bg-card/78 focus-visible:border-primary/45 focus-visible:bg-card/90 aria-invalid:border-accent disabled:cursor-not-allowed disabled:opacity-60",
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
