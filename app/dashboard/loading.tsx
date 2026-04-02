export default function DashboardLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ee-bg)' }}>
            <div className="text-center">
                <div
                    className="w-16 h-16 rounded-full animate-spin mx-auto mb-4"
                    style={{
                        border: '4px solid var(--ee-bg-pressed)',
                        borderTopColor: 'var(--ee-primary)',
                    }}
                />
                <p style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    Loading...
                </p>
            </div>
        </div>
    );
}
