"use client"

import { cn } from "@/lib/utils"

interface NeuCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "surface" | "inset"
}

export function NeuCard({ className, variant = "default", children, ...props }: NeuCardProps) {
    return (
        <div
            className={cn(
                "rounded-[24px] transition-all duration-200 ease-in-out",
                variant === "default" && "neu-card",
                variant === "surface" && "neu-surface",
                variant === "inset" && "bg-[var(--ee-bg)] shadow-[var(--shadow-neu-inset)] rounded-[24px]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

// Legacy alias
export const GlassCard = NeuCard;
