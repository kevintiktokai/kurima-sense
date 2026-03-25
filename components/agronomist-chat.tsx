"use client"

import * as React from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GlassCard } from "@/components/ui/glass-card"
import { sendToAgronomist } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    role: "user" | "ai"
    content: string
    timestamp: Date
}

export function AgronomistChat({ className }: { className?: string }) {
    const [messages, setMessages] = React.useState<Message[]>([
        {
            id: "welcome",
            role: "ai",
            content: "Hello! I'm your AI Agronomist. How are your crops looking today?",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            // Call the B.L.A.S.T. backend
            const response = await sendToAgronomist({
                user_id: "dashboard_user",
                session_id: "session_" + Date.now(),
                message: userMsg.content,
            })

            // Extract text content from the response
            const aiText = response?.content?.text_body || "I processed that, but have no specific advice right now.";

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: aiText,
                timestamp: new Date(),
            }

            setMessages((prev) => [...prev, aiMsg])
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                content: "⚠️ **Connection Error**: I couldn't reach the farm server. Is the backend running?",
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMsg])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <GlassCard className={cn("flex flex-col h-[600px] w-full max-w-2xl overflow-hidden", className)}>
            {/* Header */}
            <div className="p-4 border-b border-glass-border bg-black/5 dark:bg-white/5 flex items-center gap-3">
                <div className="relative">
                    <div className="absolute inset-0 bg-neon-green/50 blur-md rounded-full animate-pulse" />
                    <Avatar className="h-10 w-10 border-2 border-neon-green relative z-10">
                        <AvatarImage src="/bot-avatar.png" />
                        <AvatarFallback className="bg-charcoal text-neon-green font-bold">AI</AvatarFallback>
                    </Avatar>
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Agronomist AI</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="block h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                        Online & Ready
                    </p>
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 bg-muted/20">
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 max-w-[85%]",
                                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <Avatar className="h-8 w-8 mt-1 border border-glass-border shrink-0">
                                <AvatarFallback className={cn("text-xs", msg.role === 'ai' ? "bg-neon-green text-charcoal" : "bg-muted text-foreground")}>
                                    {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                                </AvatarFallback>
                            </Avatar>

                            <div
                                className={cn(
                                    "p-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === "user"
                                        ? "bg-neon-green text-charcoal rounded-tr-none"
                                        : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-tl-none border border-glass-border"
                                )}
                            >
                                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                                <div className="text-[10px] opacity-50 mt-1 text-right">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3 max-w-[85%]">
                            <Avatar className="h-8 w-8 mt-1 border border-glass-border shrink-0">
                                <AvatarFallback className="bg-neon-green text-charcoal"><Bot size={16} /></AvatarFallback>
                            </Avatar>
                            <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-neon-green" />
                                <span className="text-xs text-muted-foreground">Analyzing field data...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-glass-bg border-t border-glass-border flex gap-2">
                <Input
                    placeholder="Ask regarding pests, weather, or crop health..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-background/50 border-glass-border focus-visible:ring-neon-green"
                />
                <Button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    size="icon"
                    className="bg-neon-green hover:bg-neon-green/80 text-charcoal shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:scale-105"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </GlassCard>
    )
}
