import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full text-center text-sm font-semibold leading-snug transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_18px_52px_rgb(20_61_42/0.22)] hover:-translate-y-0.5 hover:bg-[#0f3323] hover:shadow-[0_22px_62px_rgb(20_61_42/0.28)]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-[#ded1b9]",
        outline:
          "border border-primary/22 bg-card/54 text-primary shadow-sm backdrop-blur hover:-translate-y-0.5 hover:border-accent/60 hover:bg-card",
        ghost: "text-foreground hover:bg-secondary/70",
        accent:
          "bg-accent text-accent-foreground shadow-[0_18px_46px_rgb(178_132_71/0.22)] hover:-translate-y-0.5 hover:bg-[#9d743e] hover:shadow-[0_22px_58px_rgb(178_132_71/0.28)]"
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        sm: "h-9 px-4 text-xs",
        lg: "min-h-13 px-7 py-3.5 text-base",
        icon: "size-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
