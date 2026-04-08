'use client'

import { FieldData, UserProfile } from '@/components/dashboard/types';
import { supabase, authReadyPromise } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Session token cache — avoids calling getSession() on every single fetch
let _cachedSession: { token: string; expiresAt: number } | null = null;

// Clear the cache whenever the user signs out or the token is refreshed
if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            _cachedSession = null;
        }
    });
}

// Simple in-memory cache with TTL
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

const apiCache = new Map<string, CacheEntry<unknown>>();

// In-flight request deduplication — prevents duplicate concurrent requests for the same resource
const inflightRequests = new Map<string, Promise<unknown>>();

function getCached<T>(key: string): T | null {
    const entry = apiCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
        apiCache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
    apiCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    // Evict stale entries when cache grows beyond 50 items
    if (apiCache.size > 50) {
        const now = Date.now();
        for (const [k, v] of apiCache) {
            if (now - v.timestamp > v.ttl) apiCache.delete(k);
        }
    }
}

/**
 * Deduplicate concurrent requests for the same key.
 * If a request for `key` is already in flight, returns the existing promise
 * instead of firing a duplicate network call.
 */
async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const inflight = inflightRequests.get(key) as Promise<T> | undefined;
    if (inflight) return inflight;

    const promise = fetcher().finally(() => {
        inflightRequests.delete(key);
    });
    inflightRequests.set(key, promise);
    return promise;
}

// Cache TTLs
const CACHE_TTL = {
    DASHBOARD: 5 * 60 * 1000,    // 5 minutes
    FIELDS: 2 * 60 * 1000,       // 2 minutes
    MARKET: 10 * 60 * 1000,      // 10 minutes
    INSIGHTS: 3 * 60 * 1000,     // 3 minutes
};

// Helper to get auth headers with JWT token
async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    // Skip auth on server-side
    if (typeof window === 'undefined') {
        return headers;
    }

    try {
        await authReadyPromise;

        // Return cached token if it's still valid (with 30 s buffer before expiry)
        if (_cachedSession && Date.now() < _cachedSession.expiresAt - 30_000) {
            headers['Authorization'] = `Bearer ${_cachedSession.token}`;
            return headers;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
            _cachedSession = {
                token: session.access_token,
                expiresAt: (session.expires_at ?? 0) * 1000,
            };
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
    } catch (e) {
        console.error('[API] Error getting auth session:', e);
    }

    return headers;
}

export const api = {
    async getUser(): Promise<UserProfile> {
        try {
            // First try to get from Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, phone_number, role')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    return {
                        name: profile.full_name || 'User',
                        email: session.user.email || '',
                        region: 'Zimbabwe',
                        role: profile.role || 'Farmer',
                        crops: ['Maize']
                    };
                }
            }

            // Fallback to backend API
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/user`, { headers });
            if (!res.ok) throw new Error('Failed to fetch user');
            return await res.json();
        } catch (e) {
            console.error(e);
            // Return minimal fallback - no more demo data
            return {
                name: "User",
                email: "",
                region: "Unknown",
                role: "Farmer",
                crops: []
            };
        }
    },

    /**
     * Combined endpoint — fetches dashboard stats, fields, and market prices in ONE request.
     * Eliminates 2 extra HTTP round-trips on initial dashboard load.
     */
    async getDashboardInit(): Promise<{
        stats: any;
        fields: FieldData[];
        market: any;
    } | null> {
        const cacheKey = 'dashboard_init';
        const cached = getCached<{ stats: any; fields: FieldData[]; market: any }>(cacheKey);
        if (cached) return cached;

        try {
            return await deduplicatedFetch(cacheKey, async () => {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_BASE_URL}/dashboard/init`, { headers });
                if (!res.ok) return null;
                const data = await res.json();

                // Also populate individual caches so other components benefit
                if (data.stats) setCache('dashboard_stats', data.stats, CACHE_TTL.DASHBOARD);
                if (data.fields) setCache('fields', Array.isArray(data.fields) ? data.fields : [], CACHE_TTL.FIELDS);
                if (data.market) setCache('market_prices_Zimbabwe', data.market, CACHE_TTL.MARKET);

                setCache(cacheKey, data, CACHE_TTL.FIELDS);
                return data;
            });
        } catch (e) {
            console.error('[API] getDashboardInit error:', e);
            return null;
        }
    },

    async getDashboardStats() {
        const cacheKey = 'dashboard_stats';
        const cached = getCached(cacheKey);
        if (cached) return cached;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/dashboard`, { headers });
            const data = await res.json();
            setCache(cacheKey, data, CACHE_TTL.DASHBOARD);
            return data;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async getFields(): Promise<FieldData[]> {
        const cacheKey = 'fields';
        const cached = getCached<FieldData[]>(cacheKey);
        if (cached) return cached;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields`, { headers });
            if (!res.ok) return [];
            const data = await res.json();
            const fields = Array.isArray(data) ? data : [];
            setCache(cacheKey, fields, CACHE_TTL.FIELDS);
            return fields;
        } catch (e) {
            console.error("Fetch fields error", e);
            return [];
        }
    },

    async chatWithAgronomist(message: string, context?: any, image?: string) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/send`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message, context, image })
            });
            const data = await res.json();
            return data.response;
        } catch (e) {
            console.error("Chat error", e);
            return "I'm having trouble connecting to the network right now.";
        }
    },

    async saveField(fieldData: any) {
        // fieldData: { name, crop, coordinates: [...] }
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields`, {
                method: 'POST',
                headers,
                body: JSON.stringify(fieldData)
            });
            if (!res.ok) {
                const errorBody = await res.text();
                console.error("Save Field Failed:", res.status, errorBody);
                throw new Error(`Failed to save field (${res.status}): ${errorBody || res.statusText}`);
            }
            return await res.json();
        } catch (e) {
            console.error("Save field error", e);
            throw e;
        }
    },

    async logInput(payload: { field_id: string, input_type: string, quantity: number, unit: string }) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/inputs`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to log input');
            return await res.json();
        } catch (e) {
            console.error("Log input error", e);
            throw e;
        }
    },
    async analyzeField(fieldId: string) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/analyze`, {
                method: 'POST',
                headers
            });
            if (!res.ok) throw new Error('Failed to start analysis');
            return await res.json();
        } catch (e) {
            console.error("Analyze field error", e);
            throw e;
        }
    },
    async getFieldHistory(fieldId: string) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/history`, { headers });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("Fetch history error", e);
            return [];
        }
    },
    async getChatHistory() {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/history`, { headers });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("Fetch chat history error", e);
            return [];
        }
    },

    async getProactiveInsight(context: any) {
        try {
            const headers = await getAuthHeaders();
            const seed = {
                intent_classification: "general_advice",
                raw_message: "Give me a single, short, high-impact agronomic tip for my farm right now. Keep it under 20 words.",
                context: context
            };
            const res = await fetch(`${API_BASE_URL}/proactive`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ seeds: [seed] })
            });
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const text = data.results[0]?.content?.text_body || "Scout for fall armyworm today.";
                return text.replace(/^Tip:\s*/i, "").trim();
            }
            return "Monitor soil moisture levels closely.";
        } catch (e) {
            console.error("Proactive insight error", e);
            return "Keep your fields weed-free for better yields.";
        }
    },

    async generateYieldProjection(fieldId: string) {
        const cacheKey = `yield_${fieldId}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        try {
            return await deduplicatedFetch(cacheKey, async () => {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/yield`, {
                    method: 'POST',
                    headers
                });
                if (!res.ok) throw new Error("Yield gen failed");
                const data = await res.json();
                // Cache yield projections for 10 minutes — they change slowly
                setCache(cacheKey, data, 10 * 60 * 1000);
                return data;
            });
        } catch (e) {
            console.error("Yield Gen Error", e);
            return null;
        }
    },

    async getMarketPrices(region: string = "Zimbabwe") {
        const cacheKey = `market_prices_${region}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/market/prices?region=${encodeURIComponent(region)}`, { headers });
            if (!res.ok) throw new Error("Market prices fetch failed");
            const data = await res.json();
            setCache(cacheKey, data, CACHE_TTL.MARKET);
            return data;
        } catch (e) {
            console.error("Market Prices Error", e);
            // Fallback — indicative reference prices (not live)
            return {
                region,
                prices: {
                    "Maize": { price: 285, unit: "$/t", trend: "+1.8%" },
                    "Soybean": { price: 520, unit: "$/t", trend: "+2.4%" },
                    "Tobacco": { price: 3.45, unit: "$/kg", trend: "+1.2%" },
                },
                currency: "USD",
                price_type: "indicative",
                disclaimer: "Indicative reference prices — verify with buyers before sales decisions.",
            };
        }
    },



    async getCropVarieties(cropName: string) {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/crops/${encodeURIComponent(cropName)}/varieties`, { headers });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("Fetch varieties error", e);
            return [];
        }
    },

    // ============ AI BRAIN ENHANCED METHODS ============

    /**
     * Enhanced chat using AI Brain with context awareness, vision support, and proactive insights
     */
    async chatWithAgronomistV2(message: string, options?: {
        fieldId?: string;
        sessionId?: string;
        image?: string;
        language?: string;
    }): Promise<{
        response: string;
        actions: string[];
        confidence_score: number;
        detected_intent: string;
        proactive_insights: string[];
        follow_up_questions: string[];
    }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/v2/send`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message,
                    field_id: options?.fieldId,
                    session_id: options?.sessionId,
                    image: options?.image,
                    language: options?.language
                })
            });

            if (!res.ok) {
                console.error("Chat v2 failed:", res.status);
                throw new Error(`Chat failed: ${res.statusText}`);
            }

            return await res.json();
        } catch (e) {
            console.error("Chat v2 error", e);
            return {
                response: "I'm having trouble connecting to the network right now.",
                actions: ["Try again"],
                confidence_score: 0,
                detected_intent: "error",
                proactive_insights: [],
                follow_up_questions: []
            };
        }
    },

    /**
     * SSE streaming version of AI Brain chat – tokens arrive incrementally.
     * Returns an async generator yielding { token } chunks and a final { done, detected_intent } event.
     */
    async *streamChatWithAgronomist(message: string, options?: {
        fieldId?: string;
        sessionId?: string;
        language?: string;
    }): AsyncGenerator<{ token?: string; done?: boolean; detected_intent?: string; error?: string }> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/chat/v2/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                field_id: options?.fieldId,
                session_id: options?.sessionId,
                language: options?.language
            })
        });

        if (!res.ok || !res.body) {
            yield { error: `Stream request failed: ${res.statusText}` };
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const payload = JSON.parse(line.slice(6));
                        yield payload;
                    } catch {
                        // skip malformed events
                    }
                }
            }
        }
    },

    /**
     * Analyze a crop image for diseases, pests, and nutrient deficiencies
     */
    async analyzeImage(imageBase64: string, options?: {
        cropType?: string;
        additionalContext?: string;
    }): Promise<{
        analysis: {
            detected_issues: Array<{
                name: string;
                type: string;
                confidence: number;
                severity: string;
                affected_area: string;
            }>;
            overall_health_score: number;
            diagnosis_summary: string;
            treatment_recommendations: string[];
            prevention_tips: string[];
            urgency: string;
            should_seek_expert: boolean;
        };
        timestamp: string;
        model: string;
    }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/vision/analyze`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    image: imageBase64,
                    crop_type: options?.cropType,
                    additional_context: options?.additionalContext
                })
            });

            if (!res.ok) {
                throw new Error(`Image analysis failed: ${res.statusText}`);
            }

            return await res.json();
        } catch (e) {
            console.error("Image analysis error", e);
            throw e;
        }
    },

    /**
     * Get AI capabilities and feature flags
     */
    async getAICapabilities(): Promise<{
        version: string;
        features: {
            conversation_memory: boolean;
            vision_analysis: boolean;
            multi_llm_routing: boolean;
            intent_classification: boolean;
            field_context_aware: boolean;
            weather_context_aware: boolean;
            proactive_insights: boolean;
        };
        available_intents: string[];
        supported_languages: string[];
        max_history_turns: number;
    }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/ai/capabilities`, { headers });
            if (!res.ok) throw new Error("Failed to fetch AI capabilities");
            return await res.json();
        } catch (e) {
            console.error("AI capabilities error", e);
            // Return minimal capabilities
            return {
                version: "1.0",
                features: {
                    conversation_memory: false,
                    vision_analysis: false,
                    multi_llm_routing: false,
                    intent_classification: false,
                    field_context_aware: false,
                    weather_context_aware: false,
                    proactive_insights: false
                },
                available_intents: ["general_advice"],
                supported_languages: ["en"],
                max_history_turns: 0
            };
        }
    },

    /**
     * Get AI-generated insights, risks, and actions for the user's farm
     */
    async getAIInsights(): Promise<{
        insights: Array<{
            id: string;
            type: string;
            title: string;
            message: string;
            severity: string;
            fieldName?: string;
            timestamp: string;
            actionLabel?: string;
        }>;
        risks: Array<{
            id: string;
            type: string;
            name: string;
            risk: number;
            trend: string;
            fieldName?: string;
        }>;
        actions: Array<{
            id: string;
            title: string;
            description: string;
            priority: string;
            type: string;
            fieldName?: string;
            dueDate?: string;
            estimatedTime?: string;
        }>;
        generated_at: string;
        field_count: number;
    }> {
        const cacheKey = 'ai_insights';
        const cached = getCached<any>(cacheKey);
        if (cached) return cached;

        try {
            return await deduplicatedFetch(cacheKey, async () => {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_BASE_URL}/ai/insights`, { headers });
                if (!res.ok) throw new Error("Failed to fetch AI insights");
                const data = await res.json();
                setCache(cacheKey, data, CACHE_TTL.INSIGHTS);
                return data;
            });
        } catch (e) {
            console.error("AI insights error", e);
            return {
                insights: [],
                risks: [],
                actions: [],
                generated_at: new Date().toISOString(),
                field_count: 0
            };
        }
    },

    /**
     * Delete a field and all associated data
     */
    async deleteField(fieldId: string): Promise<{
        status: string;
        message: string;
        deleted?: {
            field_id: string;
            daily_logs: number;
            field_inputs: number;
        };
    }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(errorData.detail || `Failed to delete field (${res.status})`);
            }

            // Clear fields cache after deletion
            apiCache.delete('fields');

            return await res.json();
        } catch (e) {
            console.error("Delete field error", e);
            throw e;
        }
    },

    /**
     * Get proactive alerts for a specific field (growth stage, disease risk, harvest countdown)
     */
    async getProactiveAlerts(fieldId: string): Promise<{
        field_id: string;
        field_name: string;
        crop_type: string;
        variety: {
            name: string;
            breeder?: string;
            days_to_maturity?: number;
        };
        growth_stage: {
            name: string;
            code: string;
            days_since_planting: number;
            days_to_harvest: number;
            progress_percent: number;
            description: string;
            key_activities: string[];
        };
        alerts: Array<{
            id: string;
            type: string;
            severity: string;
            title: string;
            message: string;
            action_required: boolean;
            recommended_actions: string[];
            created_at: string;
        }>;
        generated_at: string;
    }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/ai/proactive-alerts/${fieldId}`, { headers });
            if (!res.ok) throw new Error("Failed to fetch proactive alerts");
            return await res.json();
        } catch (e) {
            console.error("Proactive alerts error", e);
            throw e;
        }
    },

    /**
     * Fetch farm tasks for the user
     */
    async getTasks(date?: string, fieldId?: string): Promise<any[]> {
        try {
            const headers = await getAuthHeaders();
            let url = `${API_BASE_URL}/ai/tasks?`;
            if (date) url += `date=${date}&`;
            if (fieldId) url += `field_id=${fieldId}&`;

            const res = await fetch(url.replace(/[?&]$/, ''), { headers });
            if (!res.ok) throw new Error("Failed to fetch tasks");
            return await res.json();
        } catch (e) {
            console.error("Fetch tasks error", e);
            return [];
        }
    },

    /**
     * Update a task's status or details
     */
    async updateTask(taskId: string, updates: any): Promise<any> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/ai/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error("Failed to update task");
            return await res.json();
        } catch (e) {
            console.error("Update task error", e);
            throw e;
        }
    },

    /**
     * Create a new task manually
     */
    async createTask(task: any): Promise<any> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/ai/tasks`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (!res.ok) throw new Error("Failed to create task");
            return await res.json();
        } catch (e) {
            console.error("Create task error", e);
            throw e;
        }
    },

    /**
     * Fetch task history with completion stats over the past N days
     */
    async getTaskHistory(days: number = 30, fieldId?: string): Promise<{
        tasks: any[];
        summary: {
            total: number;
            completed: number;
            pending: number;
            completion_rate: number;
            days_covered: number;
        };
    }> {
        try {
            const headers = await getAuthHeaders();
            let url = `${API_BASE_URL}/ai/tasks/history?days=${days}`;
            if (fieldId) url += `&field_id=${fieldId}`;
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error("Failed to fetch task history");
            return await res.json();
        } catch (e) {
            console.error("Task history error", e);
            return { tasks: [], summary: { total: 0, completed: 0, pending: 0, completion_rate: 0, days_covered: days } };
        }
    },

    /**
     * Convert AI plan actions into farm tasks
     */
    async createTasksFromPlan(actions: string[], fieldId?: string): Promise<{ created: number; tasks: any[] }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/ai/tasks/from-plan`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions, field_id: fieldId })
            });
            if (!res.ok) throw new Error("Failed to create tasks from plan");
            return await res.json();
        } catch (e) {
            console.error("Create tasks from plan error", e);
            throw e;
        }
    }
};
