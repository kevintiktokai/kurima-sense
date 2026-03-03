"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Bell, Search, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

export function Header() {
    return (
        <header className="sticky top-0 z-30 w-full p-4">
            <GlassCard className="h-16 px-6 flex items-center justify-between !rounded-2xl !bg-white/5 backdrop-blur-md">

                {/* Left: Breadcrumbs / Title */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Dashboard</span>
                    <ChevronRight className="size-4" />
                    <span className="text-neon-green">Overview</span>
                </div>

                {/* Center: Search (Optional) */}
                <div className="hidden md:flex relative max-w-sm w-full mx-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search fields, crops, or advice..."
                        className="pl-10 bg-black/20 border-white/5 focus-visible:ring-neon-green/50 rounded-xl h-9"
                    />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full relative">
                        <Bell className="size-5" />
                        <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full animate-pulse" />
                    </Button>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium leading-none">Kevin Chisango</p>
                            <p className="text-xs text-muted-foreground">Pro Plan</p>
                        </div>
                        <Avatar className="size-9 border-2 border-white/10 ring-2 ring-black/20">
                            <AvatarImage src="/avatar-placeholder.png" />
                            <AvatarFallback className="bg-neon-green text-charcoal font-bold">KC</AvatarFallback>
                        </Avatar>
                    </div>
                </div>

            </GlassCard>
        </header>
    )
}
