import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "focus-ring flex min-h-12 w-full rounded-lg border border-border/85 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/75 hover:border-accent/50 aria-invalid:border-accent disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
