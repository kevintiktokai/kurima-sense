"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CloudRain, Sprout, Satellite, Info } from "lucide-react"

// Map backend alert types to icons/colors
const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'satellite': return { icon: Satellite, color: "text-blue-400" }
        case 'weather': return { icon: CloudRain, color: "text-amber-400" }
        case 'pest': return { icon: AlertCircle, color: "text-rose-400" }
        case 'growth': return { icon: Sprout, color: "text-neon-green" }
        default: return { icon: Info, color: "text-slate-400" }
    }
}

interface ActivityItem {
    type: string
    message: string
    severity: string
    time: string
}

export function RecentActivity({ activities = [] }: { activities?: ActivityItem[] }) {
    return (
        <GlassCard className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-glass-border">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    Activity Feed
                    <span className="flex h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                </h3>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                    ) : (
                        activities.map((item, i) => {
                            const { icon: Icon, color } = getIconForType(item.type)
                            return (
                                <div key={i} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0">
                                    <div className={`p-2 rounded-full bg-white/5 ${color}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium leading-none capitalize">{item.type} Alert</p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                                        <p className="text-[10px] text-slate-500 mt-2">{item.time}</p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </ScrollArea>
        </GlassCard>
    )
}
