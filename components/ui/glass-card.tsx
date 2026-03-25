"use client"

import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "neon"
}

export function GlassCard({ className, variant = "default", children, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "glass-3d rounded-3xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                variant === "neon" && "shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]",
                className
            )}
            {...props}
        >
            {/* Optional: Subtle Gradient Overlay for 'Pretty' lighting */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    )
}
