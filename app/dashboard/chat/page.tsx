"use client";

import dynamic from "next/dynamic";

const AIAgronomistChat = dynamic(
    () => import("@/components/dashboard/AIAgronomistChat"),
    {
        loading: () => (
            <div className="h-full w-full flex items-center justify-center min-h-[50vh]" style={{ background: 'var(--ee-bg)' }}>
                <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid var(--ee-bg-pressed)', borderTopColor: 'var(--ee-primary)' }} />
            </div>
        ),
        ssr: false,
    }
);

export default function ChatPage() {
    return (
        <div
            className="h-full w-full"
            style={{ background: 'var(--ee-bg)' }}
        >
            <AIAgronomistChat />
        </div>
    );
}
