"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { GlassCard } from "@/components/ui/glass-card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

interface RichStatCardProps {
    title: string
    value: string
    trend: "up" | "down" | "neutral"
    trendValue: string
    data: number[]
    color?: string
    icon?: React.ReactNode
    className?: string
}

export function RichStatCard({
    title,
    value,
    trend,
    trendValue,
    data,
    color = "#10b981",
    icon,
    className
}: RichStatCardProps) {

    const chartData = data.map((val, i) => ({ i, val }))
    const isPositive = trend === "up"
    const TrendIcon = isPositive ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus
    const trendColor = isPositive ? "text-neon-green" : trend === "down" ? "text-rose-500" : "text-slate-400"

    return (
        <GlassCard className={cn("relative overflow-hidden p-6 flex flex-col justify-between h-40", className)}>
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div className="flex justify-between items-start z-10">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-3xl font-bold tracking-tight mt-1">{value}</h3>
                </div>
                {icon && <div className={cn("p-2 rounded-lg bg-white/5", trendColor)}>{icon}</div>}
            </div>

            <div className="flex items-end justify-between gap-4 mt-auto z-10 h-16">
                <div className="flex flex-col justify-end pb-1">
                    <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                        <TrendIcon className="size-4" />
                        <span>{trendValue}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">vs last week</span>
                </div>

                <div className="h-full w-28 opacity-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke={color}
                                fill={`url(#gradient-${title})`}
                                strokeWidth={2}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </GlassCard>
    )
}
