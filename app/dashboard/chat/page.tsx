import AIAgronomistChat from "@/components/dashboard/AIAgronomistChat";
import { PageContainer } from '@/components/layout/PageContainer';

export default function ChatPage() {
    return (
        <PageContainer variant="reading" className="h-full">
            <div
                className="h-full w-full"
                style={{ background: 'var(--ee-bg)' }}
            >
                <AIAgronomistChat />
            </div>
        </PageContainer>
    );
}
