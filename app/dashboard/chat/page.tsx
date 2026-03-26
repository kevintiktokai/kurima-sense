import AIAgronomistChat from "@/components/dashboard/AIAgronomistChat";

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
