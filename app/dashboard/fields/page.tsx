"use client";

import dynamic from "next/dynamic";

const FieldManagement = dynamic(
    () => import("@/components/dashboard/FieldManagement"),
    {
        loading: () => (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid var(--ee-bg-pressed)', borderTopColor: 'var(--ee-primary)' }} />
            </div>
        ),
        ssr: false,
    }
);

export default function FieldsPage() {
    return <FieldManagement />;
}
