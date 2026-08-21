// One getAuthHeaders, not three. This file used to carry its own copy that
// called supabase.auth.getSession() on every request; the api-cache one caches
// the token until 30s before it expires. Two implementations of "am I signed
// in" is how one surface starts sending an expired token while the other
// doesn't.
import { getAuthHeaders } from '@/lib/api-cache';

import { API_BASE_URL as API_URL } from "@/lib/api-base";
import { resilientFetch } from "@/lib/http";

export interface ChatPayload {
    user_id: string;
    session_id: string;
    message: string;
    location?: { lat: number; lon: number };
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
        const response = await resilientFetch(`${API_URL}/router`, {
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
