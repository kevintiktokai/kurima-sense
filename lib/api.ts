const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
        const response = await fetch(`${API_URL}/router`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
