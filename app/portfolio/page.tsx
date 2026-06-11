import { redirect } from 'next/navigation'

// /portfolio → /portfolio/today (the institutional landing tab).
export default function PortfolioIndex() {
    redirect('/portfolio/today')
}
