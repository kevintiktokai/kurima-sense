"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
    actions?: string[];           // Suggested next actions
    proactiveInsights?: string[]; // Proactive tips from AI
    confidence?: number;          // AI confidence score
    intent?: string;              // Detected user intent
}

interface AIAgronomistChatProps {
    selectedField?: FieldData;
}

const AIAgronomistChat: React.FC<AIAgronomistChatProps> = ({ selectedField: initialField }) => {
    // Field list comes from the shared dashboard provider — no extra fetch
    const { fields: dashboardFields } = useDashboardData();
    const fields = dashboardFields as FieldData[];
    const [selectedField, setSelectedField] = useState<FieldData | undefined>(initialField);
    const searchParams = useSearchParams();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showMobileSelector, setShowMobileSelector] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial load of chat history only (fields come from the provider)
    useEffect(() => {
        api.getChatHistory().then(history => {
            if (history && history.length > 0) {
                setMessages(history);
            } else {
                setMessages([{
                    role: 'ai',
                    content: "Hello! I'm your KurimaSense AI Agronomist. I've analyzed your satellite data. Where should we start?",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            }
        });
    }, []);

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

        setMessages(prev => [...prev, {
            role: 'user',
            content: userMsg + (imageToSend ? ' [Image Uploaded]' : ''),
            timestamp: time
        }]);
        setLoading(true);

        try {
            // If there's an image, use the non-streaming v2 endpoint (vision needs full round-trip)
            if (imageToSend) {
                const response = await api.chatWithAgronomistV2(userMsg, {
                    fieldId: selectedField?.id,
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
                const placeholderIdx = Date.now(); // unique key
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

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] lg:h-[calc(100vh-180px)] gap-4 lg:gap-8 animate-in fade-in duration-500 pb-20 lg:pb-0">
            {/* Main Chat Area */}
            <div id="ai-chat-interface" className="flex-1 bg-white rounded-[2.5rem] lg:rounded-[4rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative">
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

                    {/* Mobile Field Selector Toggle */}
                    <div className="lg:hidden flex items-center gap-2">
                        <button
                            onClick={() => setShowMobileSelector(!showMobileSelector)}
                            className={`p-2 rounded-xl transition-all border ${showMobileSelector
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
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        strong: ({ node, ...props }) => <strong className={`font-black ${m.role === 'ai' ? 'text-brand-dark' : 'text-brand-lime'}`} {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                        a: ({ node, ...props }) => <a className="underline decoration-brand-lime underline-offset-2 font-bold" {...props} />,
                                    }}
                                >
                                    {m.content}
                                </ReactMarkdown>

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

            {/* Context Panel (Strategic Side Panel) */}
            <div className="hidden lg:flex flex-col w-80 xl:w-96 gap-6 overflow-y-auto min-h-0 pb-8">
                <div className="bg-brand-beige p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] border border-slate-200 shadow-sm transition-all hover:bg-white group flex-shrink-0">
                    <h4 className="font-black text-brand-dark text-lg lg:text-xl mb-6">Active Context</h4>

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
                        <div className="bg-white p-4 lg:p-5 rounded-3xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Crop Type</p>
                            <p className="font-black text-brand-dark text-base lg:text-lg">{selectedField?.crop || 'Mixed'}</p>
                        </div>
                        {selectedField && (
                            <>
                                <div className="bg-white p-4 lg:p-5 rounded-3xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NDVI Score</p>
                                    <p className="font-black text-brand-dark text-base lg:text-lg">{selectedField.ndvi.toFixed(2)}</p>
                                </div>
                                <div className="bg-white p-4 lg:p-5 rounded-3xl shadow-sm border border-slate-50 transition-all hover:translate-x-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Moisture</p>
                                    <p className="font-black text-brand-dark text-base lg:text-lg">{selectedField.soilMoisture}%</p>
                                </div>
                            </>
                        )}
                        <div className="bg-white p-4 lg:p-5 rounded-3xl shadow-sm border border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <p className="font-black text-emerald-600 text-sm uppercase tracking-tighter">● Secure Pipeline</p>
                        </div>
                    </div>
                </div>

                <div className="bg-brand-lime/10 p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] border border-brand-lime/30 shadow-sm relative overflow-hidden flex-shrink-0">
                    <h4 className="font-black text-brand-dark text-lg lg:text-xl mb-6 relative z-10">Quick Actions</h4>
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
