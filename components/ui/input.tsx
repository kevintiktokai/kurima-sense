import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-[var(--ee-muted)] h-10 w-full min-w-0 rounded-[16px] bg-[var(--ee-bg)] px-4 py-2 text-base shadow-[var(--shadow-neu-inset)] transition-all duration-200 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:bg-[var(--ee-surface)] focus-visible:shadow-[var(--shadow-neu)] focus-visible:outline-1 focus-visible:outline-[rgba(15,184,133,0.3)]",
        className
      )}
      style={{ fontFamily: 'var(--font-body)', color: 'var(--ee-text)' }}
      {...props}
    />
  )
}

export { Input }
