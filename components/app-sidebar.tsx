"use client"

import * as React from "react"
import { LayoutDashboard, Map, MessageSquare, Settings, Menu, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { GlassCard } from "@/components/ui/glass-card"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AppSidebar({ className }: SidebarProps) {
    const [collapsed, setCollapsed] = React.useState(false)

    return (
        <>
            {/* Mobile Trigger */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
                        <Menu className="h-6 w-6 text-foreground" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 bg-transparent border-none w-80">
                    <SidebarContent />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className={cn("hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 p-4", collapsed ? "w-24" : "w-80", className)}>
                <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            </div>
        </>
    )
}

function SidebarContent({ collapsed, onToggle }: { collapsed?: boolean, onToggle?: () => void }) {
    const navItems = [
        { icon: LayoutDashboard, label: "Overview", active: true },
        { icon: Map, label: "My Fields", active: false },
        { icon: MessageSquare, label: "Agronomist", active: false },
        { icon: Settings, label: "Settings", active: false },
    ]

    return (
        <GlassCard className={cn("h-full flex flex-col border-glass-border bg-glass-bg/80 backdrop-blur-3xl rounded-3xl shadow-2xl", collapsed ? "items-center" : "")}>
            {/* Header */}
            <div className={cn("p-6 flex items-center justify-between", collapsed && "flex-col gap-4 p-4")}>
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-neon-green flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0">
                        <Leaf className="h-6 w-6 text-charcoal" />
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-lg tracking-tight whitespace-nowrap">KurimaSense</span>
                    )}
                </div>
                {onToggle && (
                    <Button variant="ghost" size="icon" onClick={onToggle} className="hidden lg:flex size-8 rounded-full bg-white/5 hover:bg-white/10">
                        <Menu className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Nav */}
            <ScrollArea className="flex-1 px-4 py-2 w-full">
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <Button
                            key={item.label}
                            variant="ghost"
                            className={cn(
                                "justify-start gap-3 h-12 text-muted-foreground hover:text-foreground hover:bg-white/5",
                                item.active && "bg-neon-green/10 text-neon-green hover:bg-neon-green/20 hover:text-neon-green font-medium",
                                collapsed && "justify-center px-0"
                            )}
                        >
                            <item.icon className="size-5 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Button>
                    ))}
                </nav>
            </ScrollArea>

            {/* Footer */}
            <div className={cn("p-4 border-t border-glass-border flex flex-col gap-4", collapsed && "items-center")}>
                {!collapsed && (
                    <GlassCard className="p-3 bg-neon-green/5 border-neon-green/20">
                        <p className="text-xs font-medium text-neon-green mb-1">Pro Plan Active</p>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-[70%] bg-neon-green" />
                        </div>
                    </GlassCard>
                )}

                <div className={cn("flex items-center gap-3", collapsed && "flex-col-reverse")}>
                    <ThemeToggle />
                    {!collapsed && <span className="text-xs text-muted-foreground">v2.0.0</span>}
                </div>
            </div>
        </GlassCard>
    )
}
