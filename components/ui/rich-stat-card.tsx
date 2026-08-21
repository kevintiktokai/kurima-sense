"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { NeuCard } from "@/components/ui/glass-card"
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
    color = "#6DBE45",
    icon,
    className
}: RichStatCardProps) {

    const chartData = data.map((val, i) => ({ i, val }))
    const isPositive = trend === "up"
    const TrendIcon = isPositive ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus
    const trendColor = isPositive ? "var(--ee-primary)" : trend === "down" ? "#c44" : "var(--ee-muted)"

    return (
        <NeuCard variant="surface" className={cn("relative overflow-hidden p-6 flex flex-col justify-between h-40", className)}>
            <div className="flex justify-between items-start z-10">
                <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>{title}</p>
                    <h3 className="text-3xl tracking-tight mt-1" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--ee-text)' }}>{value}</h3>
                </div>
                {icon && <div className="p-2 rounded-[12px]" style={{ backgroundColor: 'var(--ee-bg)', color: trendColor }}>{icon}</div>}
            </div>

            <div className="flex items-end justify-between gap-4 mt-auto z-10 h-16">
                <div className="flex flex-col justify-end pb-1">
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: trendColor }}>
                        <TrendIcon className="size-4" />
                        <span style={{ fontFamily: 'var(--font-body)' }}>{trendValue}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>vs last week</span>
                </div>

                <div className="h-full w-28 opacity-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
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
        </NeuCard>
    )
}
