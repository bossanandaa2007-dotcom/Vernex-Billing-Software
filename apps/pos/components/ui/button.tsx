import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vernex-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-vernex-navy text-white shadow-sm hover:bg-vernex-dark dark:bg-vernex-gold dark:text-vernex-dark dark:hover:bg-vernex-gold-soft",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-vernex-navy/20 bg-white text-vernex-navy shadow-sm hover:border-vernex-gold hover:bg-vernex-gold/10 dark:border-[#1E335F] dark:bg-vernex-navy dark:text-white dark:hover:border-vernex-gold dark:hover:bg-vernex-gold/10",
        secondary:
          "bg-vernex-gold text-vernex-dark shadow-sm hover:bg-vernex-gold-soft",
        ghost: "text-vernex-navy hover:bg-vernex-navy/5 dark:text-white dark:hover:bg-white/10",
        link: "text-vernex-navy underline-offset-4 hover:text-vernex-gold hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
