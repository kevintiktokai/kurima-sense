import { supabase, authReadyPromise } from '@/lib/supabase';

import { API_BASE_URL as API_URL } from "@/lib/api-base";

export interface ChatPayload {
    user_id: string;
    session_id: string;
    message: string;
    location?: { lat: number; lon: number };
}

/**
 * Get auth headers with Supabase JWT token for backend requests.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (typeof window === "undefined") return headers;

    try {
        await authReadyPromise;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
        }
    } catch (e) {
        console.error("[lib/api] Error getting auth session:", e);
    }

    return headers;
}

export async function sendToAgronomist(payload: ChatPayload) {
    // Construct the "Seed" expected by the B.L.A.S.T. backend
    const seed = {
        user_id: payload.user_id,
        session_id: payload.session_id,
        timestamp: new Date().toISOString(),
        location: payload.location || { lat: -17.82, lon: 31.05 }, // Default: Harare
        context: { source: "web_dashboard" },
        intent_classification: "general_advice", // simplified for now, or let router decide
        raw_message: payload.message,
    };

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/router`, {
            method: "POST",
            headers,
            body: JSON.stringify(seed),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Agronomist API Error:", error);
        throw error;
    }
}
