"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/services/api';
import { useSearchParams } from 'next/navigation';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';
import remarkGfm from 'remark-gfm';
import { FieldData } from './types';

// Defer react-markdown (~45KB) until the chat page is actually loaded
const ReactMarkdown = dynamic(() => import('react-markdown'), {
    ssr: false,
    loading: () => null,
});

interface Message {
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    image?: string;               // data-URL preview for attached photos (LLM-style bubble)
    actions?: string[];           // Suggested next actions
    proactiveInsights?: string[]; // Proactive tips from AI
    confidence?: number;          // AI confidence score
    intent?: string;              // Detected user intent
}

interface ChatSession {
    id: string;
    title: string;
    updated_at: string | null;
    message_count: number;
    preview: string;
}

interface AIAgronomistChatProps {
    selectedField?: FieldData;
}

const WELCOME: Message = {
    role: 'ai',
    content: "Hello! I'm your KurimaSense AI Agronomist. I've analyzed your satellite data. Where should we start?",
    timestamp: '',
};

const AIAgronomistChat: React.FC<AIAgronomistChatProps> = ({ selectedField: initialField }) => {
    // Field list comes from the shared dashboard provider — no extra fetch
    const { fields: dashboardFields } = useDashboardData();
    const fields = dashboardFields as FieldData[];
    const [selectedField, setSelectedField] = useState<FieldData | undefined>(initialField);
    const searchParams = useSearchParams();

    const [messages, setMessages] = useState<Message[]>([WELCOME]);
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showMobileSelector, setShowMobileSelector] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── LLM-style sessions: history sidebar, new chat, resume past chats ──
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false); // mobile drawer
    const [sessionsLoading, setSessionsLoading] = useState(true);

    const refreshSessions = useCallback(async () => {
        const list = await api.listChatSessions();
        setSessions(list);
        setSessionsLoading(false);
        return list;
    }, []);

    // On mount: load the session list. The newest session is NOT auto-opened —
    // like other LLM apps, you land on a fresh chat and can resume from history.
    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    const openSession = useCallback(async (sessionId: string) => {
        setActiveSessionId(sessionId);
        setShowHistory(false);
        setLoading(true);
        try {
            const msgs = await api.getChatSessionMessages(sessionId);
            if (msgs.length > 0) {
                setMessages(msgs.map(m => ({
                    role: m.role === 'user' ? 'user' as const : 'ai' as const,
                    content: m.content,
                    timestamp: m.created_at
                        ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '',
                })));
            } else {
                setMessages([WELCOME]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const startNewChat = useCallback(() => {
        // Lazy creation: the session row is only created when the first message
        // is sent, so abandoned "new chats" never litter the history.
        setActiveSessionId(null);
        setMessages([WELCOME]);
        setShowHistory(false);
    }, []);

    const removeSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await api.deleteChatSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) startNewChat();
    }, [activeSessionId, startNewChat]);

    // Stable remark plugins reference so the dynamic ReactMarkdown doesn't reset on every render
    const remarkPlugins = useMemo(() => [remarkGfm], []);

    // Handle initialMessage from URL (e.g. from "Ask Follow-up" button)
    useEffect(() => {
        const initialMessage = searchParams.get('initialMessage');
        const fieldIdParam = searchParams.get('fieldId');

        if (fields.length > 0 && fieldIdParam) {
            const matched = fields.find(f => f.id === fieldIdParam);
            if (matched) setSelectedField(matched);
        }

        if (initialMessage && !input && messages.length <= 1) {
            // Pre-fill input instead of auto-sending to let user review
            setInput(decodeURIComponent(initialMessage));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, fields]);

    // Also sync prop if it changes
    useEffect(() => {
        if (initialField) setSelectedField(initialField);
    }, [initialField]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || loading) return;

        const userMsg = input;
        const imageToSend = selectedImage; // buffer
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setInput('');
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Image renders as a real preview bubble, not a "[Image Uploaded]" text tag
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMsg,
            image: imageToSend || undefined,
            timestamp: time,
        }]);
        setLoading(true);

        try {
            // Ensure a session exists so this exchange lands in history and can
            // be resumed later. Created lazily on the first send of a new chat.
            let sessionId = activeSessionId;
            const isFirstMessage = !sessionId;
            if (!sessionId) {
                const created = await api.createChatSession();
                if (created) {
                    sessionId = created.id;
                    setActiveSessionId(created.id);
                }
            }

            // If there's an image, use the non-streaming v2 endpoint (vision needs full round-trip)
            if (imageToSend) {
                const response = await api.chatWithAgronomistV2(userMsg || 'Please analyze this photo of my crop.', {
                    fieldId: selectedField?.id,
                    sessionId: sessionId || undefined,
                    image: imageToSend,
                    language: 'en'
                });
                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: response.response || "Analysis complete.",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    actions: response.actions,
                    proactiveInsights: response.proactive_insights,
                    confidence: response.confidence_score,
                    intent: response.detected_intent
                }]);
            } else {
                // Use SSE streaming for text-only queries – tokens arrive incrementally
                let streamedText = '';
                let detectedIntent = '';

                // Add an empty AI message that we'll fill incrementally
                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: '',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);

                try {
                    for await (const event of api.streamChatWithAgronomist(userMsg, {
                        fieldId: selectedField?.id,
                        sessionId: sessionId || undefined,
                        language: 'en'
                    })) {
                        if (event.error) {
                            throw new Error(event.error);
                        }
                        if (event.token) {
                            streamedText += event.token;
                            // Update the last message in-place
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    ...updated[updated.length - 1],
                                    content: streamedText
                                };
                                return updated;
                            });
                        }
                        if (event.done) {
                            detectedIntent = event.detected_intent || '';
                            // Final update with intent metadata
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    ...updated[updated.length - 1],
                                    content: streamedText || 'Analysis complete.',
                                    intent: detectedIntent
                                };
                                return updated;
                            });
                        }
                    }
                } catch (streamErr) {
                    console.warn("SSE stream failed, falling back to v2:", streamErr);
                    // Remove the empty placeholder
                    setMessages(prev => prev.slice(0, -1));
                    // Fallback to non-streaming v2
                    const response = await api.chatWithAgronomistV2(userMsg, {
                        fieldId: selectedField?.id,
                        sessionId: sessionId || undefined,
                        language: 'en'
                    });
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: response.response || "Analysis complete.",
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        actions: response.actions,
                        proactiveInsights: response.proactive_insights,
                        confidence: response.confidence_score,
                        intent: response.detected_intent
                    }]);
                }
            }

            // First exchange of a new chat: pick up the auto-generated title
            if (isFirstMessage) refreshSessions();
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "I encountered a connectivity issue. Please try again.",
                timestamp: time
            }]);
        } finally {
            setLoading(false);
        }
    };

    // ── Sessions list (shared by desktop sidebar + mobile drawer) ──
    const SessionList = ({ compact = false }: { compact?: boolean }) => (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {sessionsLoading ? (
                <p className="text-[11px] text-slate-400 font-bold px-3 py-2">Loading history…</p>
            ) : sessions.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium px-3 py-2 leading-relaxed">
                    No past chats yet. Your conversations will appear here.
                </p>
            ) : (
                sessions.map(s => (
                    <div
                        key={s.id}
                        onClick={() => openSession(s.id)}
                        className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                            activeSessionId === s.id
                                ? 'bg-brand-lime/20 text-brand-dark'
                                : compact ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-brand-dark'
                        }`}
                    >
                        <span className="material-symbols-outlined mt-0.5 flex-shrink-0 opacity-50" style={{ fontSize: '16px' }}>
                            chat_bubble
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{s.title}</p>
                            {s.preview && (
                                <p className={`text-[10px] truncate ${compact ? 'opacity-60' : 'text-slate-400'}`}>{s.preview}</p>
                            )}
                        </div>
                        <button
                            onClick={(e) => removeSession(s.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 flex-shrink-0"
                            title="Delete chat"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#E05C5C' }}>delete</span>
                        </button>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] lg:h-[calc(100vh-180px)] gap-4 lg:gap-6 animate-in fade-in duration-500 pb-20 lg:pb-0">

            {/* ── CHAT HISTORY SIDEBAR (desktop) — LLM-style ── */}
            <div className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 bg-white rounded-[2rem] shadow-xl border border-slate-100 p-4 min-h-0">
                <button
                    onClick={startNewChat}
                    className="w-full mb-4 px-4 py-3 rounded-2xl bg-brand-dark text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    New chat
                </button>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">History</p>
                <SessionList />
            </div>

            {/* Main Chat Area */}
            <div id="ai-chat-interface" className="flex-1 bg-white rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative min-w-0">
                <div className="p-5 lg:p-8 bg-brand-dark text-white flex items-center justify-between border-b border-brand-lime/10 relative z-20">
                    <div className="flex items-center gap-3 lg:gap-5 flex-1 min-w-0">
                        <div className="w-10 lg:w-14 h-10 lg:h-14 bg-brand-lime rounded-full flex items-center justify-center text-xl lg:text-3xl shadow-lg ring-4 ring-brand-lime/20 flex-shrink-0">✨</div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm lg:text-xl font-black tracking-tight truncate">
                                {selectedField ? `Advising: ${selectedField.name}` : 'AI Advisory'}
                            </h3>
                            <p className="text-[8px] lg:text-xs text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">Active • Expert Context</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Mobile: chat history drawer toggle */}
                        <button
                            onClick={() => { setShowHistory(!showHistory); setShowMobileSelector(false); }}
                            className={`lg:hidden p-2 rounded-xl transition-all border ${showHistory
                                ? 'bg-brand-lime text-brand-dark border-brand-lime'
                                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                }`}
                            title="Chat history"
                        >
                            <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>history</span>
                        </button>
                        {/* Mobile: new chat */}
                        <button
                            onClick={startNewChat}
                            className="lg:hidden p-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                            title="New chat"
                        >
                            <span className="material-symbols-outlined block" style={{ fontSize: '20px' }}>add</span>
                        </button>
                        {/* Mobile Field Selector Toggle */}
                        <button
                            onClick={() => { setShowMobileSelector(!showMobileSelector); setShowHistory(false); }}
                            className={`lg:hidden p-2 rounded-xl transition-all border ${showMobileSelector
                                ? 'bg-brand-lime text-brand-dark border-brand-lime'
                                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                }`}
                        >
                            <svg className={`w-5 h-5 transition-transform duration-300 ${showMobileSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile chat-history drawer */}
                {showHistory && (
                    <div className="lg:hidden absolute top-[76px] left-0 right-0 bottom-0 bg-brand-dark z-30 animate-in slide-in-from-top duration-300 flex flex-col p-5">
                        <button
                            onClick={startNewChat}
                            className="w-full mb-4 px-4 py-3 rounded-2xl bg-brand-lime text-brand-dark font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                            New chat
                        </button>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">History</p>
                        <SessionList compact />
                    </div>
                )}

                {/* Mobile Selector Overlay/Dropdown */}
                {showMobileSelector && (
                    <div className="lg:hidden absolute top-[76px] left-0 right-0 bg-brand-dark border-b border-brand-lime/10 z-30 animate-in slide-in-from-top duration-300 shadow-2xl">
                        <div className="p-5 space-y-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Context</label>
                            <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                <button
                                    onClick={() => {
                                        setSelectedField(undefined);
                                        setShowMobileSelector(false);
                                    }}
                                    className={`w-full p-4 rounded-2xl text-left transition-all border ${!selectedField
                                        ? 'bg-brand-lime text-brand-dark border-brand-lime shadow-lg'
                                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm">Full Farm View</span>
                                        {!selectedField && <span className="text-xs">Active</span>}
                                    </div>
                                </button>
                                {fields.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            setSelectedField(f);
                                            setShowMobileSelector(false);
                                        }}
                                        className={`w-full p-4 rounded-2xl text-left transition-all border ${selectedField?.id === f.id
                                            ? 'bg-brand-lime text-brand-dark border-brand-lime shadow-lg'
                                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{f.name}</p>
                                                <p className="text-[10px] opacity-70 uppercase tracking-wide font-medium">{f.crop}</p>
                                            </div>
                                            {selectedField?.id === f.id && <span className="text-xs font-bold">Active</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Quick Actions */}
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'Fertilizer Logic', icon: '🧪' },
                                        { label: 'Pest Diagnosis', icon: '🪲' },
                                        { label: 'Yield Predictor', icon: '💰' }
                                    ].map(t => (
                                        <button
                                            key={t.label}
                                            onClick={() => {
                                                setInput(`Give me advice on ${t.label} for ${selectedField ? selectedField.name : 'my farm'}`);
                                                setShowMobileSelector(false);
                                            }}
                                            className="px-4 py-2 bg-white/10 hover:bg-brand-lime hover:text-brand-dark text-[10px] font-black text-white rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest border border-white/5"
                                        >
                                            <span>{t.icon}</span> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-5 lg:p-10 space-y-6 lg:space-y-8 scroll-smooth">
                    {messages.map((m, i) => (
                        <div key={`${m.timestamp}-${m.role}-${i}`} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] lg:max-w-[75%] p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] text-sm lg:text-[15px] leading-relaxed shadow-sm ${m.role === 'user'
                                ? 'bg-brand-dark text-white rounded-tr-none'
                                : 'bg-brand-beige text-brand-dark rounded-tl-none border border-slate-100'
                                }`}>
                                {/* Attached photo renders as a proper image bubble (LLM-style) */}
                                {m.image && (
                                    <img
                                        src={m.image}
                                        alt="Attached crop photo"
                                        className={`rounded-2xl max-h-56 w-auto object-cover border border-white/20 shadow-md ${m.content ? 'mb-3' : ''}`}
                                    />
                                )}
                                {m.content && (
                                    <ReactMarkdown
                                        remarkPlugins={remarkPlugins}
                                        components={{
                                            strong: ({ ...props }) => <strong className={`font-black ${m.role === 'ai' ? 'text-brand-dark' : 'text-brand-lime'}`} {...props} />,
                                            ul: ({ ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                            ol: ({ ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                                            li: ({ ...props }) => <li className="pl-1" {...props} />,
                                            p: ({ ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                            a: ({ ...props }) => <a className="underline decoration-brand-lime underline-offset-2 font-bold" {...props} />,
                                        }}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                )}

                                {/* Show actions as clickable chips for AI messages */}
                                {m.role === 'ai' && m.actions && m.actions.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Suggested Actions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {m.actions.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setInput(action)}
                                                    className="px-3 py-1.5 bg-brand-lime/20 hover:bg-brand-lime text-brand-dark text-xs font-bold rounded-full transition-all hover:scale-105"
                                                >
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Show proactive insights as tips */}
                                {m.role === 'ai' && m.proactiveInsights && m.proactiveInsights.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">💡 Pro Tips</p>
                                        <ul className="space-y-1 text-xs text-slate-600">
                                            {m.proactiveInsights.map((insight, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-0.5">•</span>
                                                    {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 px-3 lg:px-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{m.timestamp}</span>
                                {m.role === 'ai' && m.confidence !== undefined && m.confidence > 0 && (
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-600' :
                                        m.confidence >= 0.5 ? 'bg-amber-100 text-amber-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                        {Math.round(m.confidence * 100)}% confident
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-brand-beige p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] rounded-tl-none">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef}></div>
                </div>

                {/* Message Input Container */}
                <div className="p-4 lg:p-8 border-t border-slate-50 bg-brand-beige/30 backdrop-blur-sm">
                    {selectedImage && (
                        <div className="mb-4 relative inline-block">
                            <img src={selectedImage} alt="Preview" className="h-16 lg:h-20 w-16 lg:w-20 object-cover rounded-xl lg:rounded-2xl border-2 border-brand-lime shadow-md" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2 lg:gap-4 items-center bg-white border border-slate-200 p-2 lg:p-3 rounded-full shadow-sm ring-4 ring-slate-100 focus-within:ring-brand-lime/20 transition-all">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 lg:p-3 text-slate-400 hover:text-brand-dark hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                        >
                            <svg className="w-5 lg:w-6 h-5 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Message agronomist..."
                            className="flex-1 bg-transparent border-none outline-none text-sm lg:text-base font-medium placeholder:text-slate-300 text-brand-dark min-w-0"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || (!input.trim() && !selectedImage)}
                            className="bg-brand-dark text-white w-10 lg:w-14 h-10 lg:h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform flex-shrink-0 disabled:opacity-50"
                        >
                            <svg className="w-5 lg:w-6 h-5 lg:h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Context Panel (Strategic Side Panel) — xl+ so the history sidebar,
                chat and context all fit without squeezing the conversation */}
            <div className="hidden xl:flex flex-col w-80 gap-6 overflow-y-auto min-h-0 pb-8">
                <div className="bg-brand-beige p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:bg-white group flex-shrink-0">
                    <h4 className="font-black text-brand-dark text-lg mb-6">Active Context</h4>

                    {/* Field Selector */}
                    <div className="mb-6">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Field</label>
                        <select
                            className="w-full p-4 rounded-2xl border-none font-bold text-brand-dark shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-brand-lime bg-white"
                            value={selectedField?.id || ''}
                            onChange={(e) => {
                                const matched = fields.find(f => f.id === e.target.value);
                                setSelectedField(matched);
                            }}
                        >
                            <option value="">Full Farm View</option>
                            {fields.map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Crop Type</p>
                            <p className="font-black text-brand-dark text-base">{selectedField?.crop || 'Mixed'}</p>
                        </div>
                        {selectedField && (
                            <>
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NDVI Score</p>
                                    <p className="font-black text-brand-dark text-base">{selectedField.ndvi.toFixed(2)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Moisture</p>
                                    <p className="font-black text-brand-dark text-base">{selectedField.soilMoisture}%</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-brand-lime/10 p-8 rounded-[2.5rem] border border-brand-lime/30 shadow-sm relative overflow-hidden flex-shrink-0">
                    <h4 className="font-black text-brand-dark text-lg mb-6 relative z-10">Quick Actions</h4>
                    <div className="space-y-3 relative z-10">
                        {[
                            { label: 'Fertilizer Logic', icon: '🧪' },
                            { label: 'Pest Diagnosis', icon: '🪲' },
                            { label: 'Yield Predictor', icon: '💰' }
                        ].map(t => (
                            <button
                                key={t.label}
                                onClick={() => setInput(`Give me advice on ${t.label} for ${selectedField ? selectedField.name : 'my farm'}`)}
                                className="w-full text-left p-4 rounded-2xl bg-white/60 text-[10px] font-black text-brand-dark hover:bg-brand-lime transition-all flex items-center gap-3 uppercase tracking-widest"
                            >
                                <span>{t.icon}</span> {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                </div>
            </div>
        </div>
    );
};
export default AIAgronomistChat;
