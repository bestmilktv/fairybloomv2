import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-lg",
        link: "text-primary underline-offset-4 hover:underline",
        luxury: "bg-luxury text-luxury-foreground hover:bg-luxury/90 rounded-xl font-serif tracking-wide",
        gold: "bg-gold text-gold-foreground hover:bg-gold/90 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300",
        nature: "bg-nature text-nature-foreground hover:bg-nature/90 rounded-xl",
        premium: "bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30 text-luxury hover:from-gold/30 hover:to-gold/20 hover:border-gold/50 rounded-xl backdrop-blur-sm",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
