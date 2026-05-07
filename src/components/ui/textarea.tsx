import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring flex min-h-28 w-full resize-none rounded-lg border border-border/85 bg-card/80 px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/75 hover:border-accent/50 aria-invalid:border-accent disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
