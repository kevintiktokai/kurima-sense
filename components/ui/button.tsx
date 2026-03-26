import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-[var(--ee-primary)] text-white hover:opacity-90 shadow-[var(--shadow-neu)] active:shadow-[var(--shadow-neu-inset)]",
        destructive:
          "bg-[#c44] text-white hover:opacity-90",
        outline:
          "bg-[var(--ee-bg)] shadow-[var(--shadow-neu)] hover:bg-[var(--ee-bg-dim)] text-[var(--ee-text)] active:shadow-[var(--shadow-neu-inset)]",
        secondary:
          "bg-[var(--ee-bg)] text-[var(--ee-text)] shadow-[var(--shadow-neu)] hover:bg-[var(--ee-bg-dim)] active:shadow-[var(--shadow-neu-inset)]",
        ghost:
          "hover:bg-[var(--ee-bg)] text-[var(--ee-text)]",
        link: "text-[var(--ee-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        xs: "h-7 gap-1 px-3 text-xs",
        sm: "h-8 gap-1.5 px-4",
        lg: "h-12 px-8 text-base",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={{ fontFamily: 'var(--font-body)' }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
