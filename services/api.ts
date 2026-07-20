'use client'

import { FieldData, UserProfile } from '@/components/dashboard/types';
import { supabase } from '@/lib/supabase';
import { apiCache, getCached, setCache, invalidateCache, getAuthHeaders, CACHE_TTL } from '@/lib/api-cache';

import { API_BASE_URL } from '@/lib/api-base';
import { trackEvent } from '@/lib/analytics';

// ───── Soil Intelligence types ─────
export interface SoilAttribute {
    key: string;
    value: string | number | null;
    unit?: string | null;
    source: string;
    confidence?: number | null;
    acquired_at?: string;
    refresh_policy?: string;
    detail?: string | null;
    derived?: boolean;
}

export interface SoilProfileResponse {
    available: boolean;
    field_id?: string;
    lat?: number | null;
    lon?: number | null;
    built_at?: string;
    provider_status?: Record<string, string>;
    attributes: Record<string, SoilAttribute>;
    summary?: string;
}

export const api = {
    async getUser(): Promise<UserProfile> {
        try {
            // First try to get from Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, phone_number, role, persona')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    return {
                        name: profile.full_name || 'User',
                        email: session.user.email || '',
                        region: 'Zimbabwe',
                        role: profile.persona || profile.role || 'Farmer',
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
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/dashboard/init`, { headers });
            if (!res.ok) return null;
            const data = await res.json();

            // Also populate individual caches so other components benefit
            if (data.stats) setCache('dashboard_stats', data.stats, CACHE_TTL.DASHBOARD);
            if (data.fields) setCache('fields', Array.isArray(data.fields) ? data.fields : [], CACHE_TTL.FIELDS);
            if (data.market) setCache('market_prices_Zimbabwe', data.market, CACHE_TTL.MARKET);

            setCache(cacheKey, data, CACHE_TTL.FIELDS); // shortest TTL of the three
            return data;
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

    async getFields(force = false, opts?: { throwOnError?: boolean }): Promise<FieldData[]> {
        const cacheKey = 'fields';
        if (!force) {
            const cached = getCached<FieldData[]>(cacheKey);
            if (cached) return cached;
        }

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields`, { headers });
            if (!res.ok) {
                // throwOnError lets the dashboard distinguish "backend down"
                // from "genuinely no fields" — silently returning [] here made a
                // 502 render as an empty farm, which reads as data loss.
                if (opts?.throwOnError) throw new Error(`Fields request failed (${res.status})`);
                return [];
            }
            const data = await res.json();
            const fields = Array.isArray(data) ? data : [];
            setCache(cacheKey, fields, CACHE_TTL.FIELDS);
            return fields;
        } catch (e) {
            console.error("Fetch fields error", e);
            if (opts?.throwOnError) throw e;
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
            // Invalidate stale field/dashboard caches so callers see the new field immediately
            invalidateCache('fields');
            invalidateCache('dashboard_init');
            invalidateCache('dashboard_stats');
            // Activation conversion: the first real product action after signup.
            trackEvent('FieldCreated', { crop: fieldData?.crop });
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
    /**
     * @deprecated Superseded by the Field State Aggregator. Consumer screens read
     * the KurimaScore trend from `useFieldState(id).indices.trend_30d` instead.
     * No longer called by any screen; kept only for transitional callers.
     */
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

    // ───── Soil Intelligence ─────
    // Returns the persisted multi-provider soil/terrain profile for a field.
    // Built once at field creation and reused locally, so this is cheap; the
    // backend lazily builds it on first access if missing.
    async getFieldSoil(fieldId: string): Promise<SoilProfileResponse | null> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/soil`, { headers });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Fetch soil profile error", e);
            return null;
        }
    },
    async refreshFieldSoil(fieldId: string): Promise<SoilProfileResponse | null> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/soil/refresh`, {
                method: "POST", headers,
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Refresh soil profile error", e);
            return null;
        }
    },

    // ───── Chat sessions (LLM-style advisor: history sidebar, new/resume) ─────

    async listChatSessions(): Promise<Array<{
        id: string; title: string; created_at: string | null;
        updated_at: string | null; message_count: number; preview: string;
    }>> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/sessions`, { headers });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("List chat sessions error", e);
            return [];
        }
    },

    async createChatSession(title?: string): Promise<{ id: string; title: string } | null> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(title ? { title } : {}),
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error("Create chat session error", e);
            return null;
        }
    },

    async getChatSessionMessages(sessionId: string): Promise<Array<{
        role: string; content: string; created_at: string | null;
    }>> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, { headers });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error("Get session messages error", e);
            return [];
        }
    },

    async renameChatSession(sessionId: string, title: string): Promise<boolean> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ title }),
            });
            return res.ok;
        } catch (e) {
            console.error("Rename chat session error", e);
            return false;
        }
    },

    async deleteChatSession(sessionId: string): Promise<boolean> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers,
            });
            return res.ok;
        } catch (e) {
            console.error("Delete chat session error", e);
            return false;
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

    /**
     * @deprecated For field *display* values (projected/potential yield, confidence)
     * use `useFieldState(id).yield_projection`, which bands confidence and shares one
     * source of truth. Still used to generate the AI Smart Crop Plan steps
     * (full_plan / next_actions), which have no aggregator equivalent yet — see
     * docs/aggregator_cleanup_audit.md, Findings.
     */
    async generateYieldProjection(fieldId: string) {
        const cacheKey = `yield_${fieldId}`;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}/yield`, {
                method: 'POST',
                headers
            });
            if (!res.ok) throw new Error("Yield gen failed");
            const data = await res.json();
            setCache(cacheKey, data, CACHE_TTL.YIELD);
            return data;
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
        const cacheKey = `varieties_${cropName}`;
        const cached = getCached<any[]>(cacheKey);
        if (cached) return cached;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/crops/${encodeURIComponent(cropName)}/varieties`, { headers });
            if (!res.ok) return [];
            const data = await res.json();
            // Only cache a non-empty catalogue. Caching an empty result for the
            // 24h VARIETIES TTL would keep the variety picker hidden long after
            // the backend catalogue is populated (it self-seeds on boot).
            if (Array.isArray(data) && data.length > 0) {
                setCache(cacheKey, data, CACHE_TTL.VARIETIES);
            }
            return data;
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
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/ai/insights`, { headers });
            if (!res.ok) throw new Error("Failed to fetch AI insights");
            return await res.json();
        } catch (e) {
            console.error("AI insights error", e);
            // Return empty fallback
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
     * Edit a field's agronomic metadata after creation (Phase 4 — field
     * management). Partial update: only supplied keys change. Accepts any of
     * name, crop, variety, plantingDate, transplantDate, fertilizerHistory,
     * isTransplanted. Clears the fields cache so the edit shows immediately.
     */
    async updateField(fieldId: string, updates: {
        name?: string;
        crop?: string;
        variety?: string;
        plantingDate?: string;
        transplantDate?: string;
        fertilizerHistory?: string;
        isTransplanted?: boolean;
    }): Promise<{ status: string; field: any }> {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_BASE_URL}/fields/${fieldId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(errorData.detail || `Failed to update field (${res.status})`);
            }
            apiCache.delete('fields');
            return await res.json();
        } catch (e) {
            console.error("Update field error", e);
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
