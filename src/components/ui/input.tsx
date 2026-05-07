import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "focus-ring flex min-h-13 w-full rounded-xl border border-border/75 bg-background/62 px-4 py-3 text-[0.95rem] text-foreground shadow-[inset_0_1px_0_rgb(255_250_240/0.7)] transition-all duration-300 placeholder:text-muted-foreground/70 hover:border-accent/45 hover:bg-card/78 focus-visible:border-primary/45 focus-visible:bg-card/90 aria-invalid:border-accent disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
