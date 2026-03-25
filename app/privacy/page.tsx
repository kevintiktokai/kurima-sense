'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#EBEBE3] py-12 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                {/* Header */}
                <div className="mb-8">
                    <Link 
                        href="/auth" 
                        className="inline-flex items-center gap-2 text-[#2D3A26]/60 hover:text-[#2D3A26] transition-colors mb-6"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-4xl font-bold text-[#2D3A26] mb-2">Privacy Policy</h1>
                    <p className="text-[#2D3A26]/60">Last updated: February 5, 2026</p>
                </div>

                {/* Content Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl border border-[#2D3A26]/10">
                    
                    {/* Introduction */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
                        <div className="flex gap-4">
                            <span className="text-2xl">🔒</span>
                            <div>
                                <h3 className="font-bold text-emerald-800 mb-2">Your Data, Your Farm</h3>
                                <p className="text-emerald-700 text-sm">
                                    We understand your farm data is sensitive. This policy explains how we collect, 
                                    use, and protect your information.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-8 text-[#2D3A26]">
                        
                        <section>
                            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
                            
                            <h3 className="text-lg font-semibold mt-6 mb-3">Account Information</h3>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Email address and name</li>
                                <li>Phone number (optional, for WhatsApp notifications)</li>
                                <li>Farm role/type (commercial farmer, smallholder, etc.)</li>
                            </ul>

                            <h3 className="text-lg font-semibold mt-6 mb-3">Farm & Field Data</h3>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Field boundaries (GPS coordinates/polygons)</li>
                                <li>Crop types, varieties, and planting dates</li>
                                <li>Input application records (fertilizers, chemicals)</li>
                                <li>Yield history and harvest records</li>
                                <li>Satellite-derived data (NDVI, soil moisture estimates)</li>
                            </ul>

                            <h3 className="text-lg font-semibold mt-6 mb-3">Usage Data</h3>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Chat interactions with the AI agronomist</li>
                                <li>Feature usage patterns</li>
                                <li>Device and browser information</li>
                            </ul>

                            <h3 className="text-lg font-semibold mt-6 mb-3">Images (Optional)</h3>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Crop photos submitted for disease diagnosis</li>
                                <li>These are processed by our AI and may be stored for model improvement</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Data</h2>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                <p className="text-blue-800 flex items-start gap-2">
                                    <span className="mt-1">📊</span> 
                                    <span><strong>Personalized Recommendations:</strong> To provide variety-specific advice and growth stage tracking</span>
                                </p>
                                <p className="text-blue-800 flex items-start gap-2">
                                    <span className="mt-1">🌾</span> 
                                    <span><strong>Yield Projections:</strong> To calculate accurate, agronomically-grounded estimates</span>
                                </p>
                                <p className="text-blue-800 flex items-start gap-2">
                                    <span className="mt-1">🦠</span> 
                                    <span><strong>Disease Risk Alerts:</strong> To warn you about variety-specific risks based on weather</span>
                                </p>
                                <p className="text-blue-800 flex items-start gap-2">
                                    <span className="mt-1">📈</span> 
                                    <span><strong>Model Improvement:</strong> To improve our AI predictions (anonymized and aggregated)</span>
                                </p>
                                <p className="text-blue-800 flex items-start gap-2">
                                    <span className="mt-1">📱</span> 
                                    <span><strong>Notifications:</strong> To send proactive alerts about your fields (if enabled)</span>
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">3. Data Storage & Security</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                Your data is stored securely using industry-standard practices:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li><strong>Database:</strong> Supabase (PostgreSQL) with row-level security</li>
                                <li><strong>Authentication:</strong> Secure OAuth and password hashing</li>
                                <li><strong>Encryption:</strong> Data encrypted in transit (HTTPS) and at rest</li>
                                <li><strong>Access Control:</strong> Only you can see your farm data</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">4. Data Sharing</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                <strong>We do NOT sell your personal farm data.</strong> We may share data in these limited cases:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li><strong>Service Providers:</strong> Weather APIs, satellite imagery providers (they receive coordinates only)</li>
                                <li><strong>AI Processing:</strong> OpenAI for chat functionality (messages only, not field data)</li>
                                <li><strong>Aggregated Statistics:</strong> Anonymous, aggregated data for agricultural research</li>
                                <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                You have the right to:
                            </p>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                                <p className="text-emerald-800 flex items-center gap-2">
                                    <span>✅</span> Access your data and download it
                                </p>
                                <p className="text-emerald-800 flex items-center gap-2">
                                    <span>✅</span> Correct inaccurate information
                                </p>
                                <p className="text-emerald-800 flex items-center gap-2">
                                    <span>✅</span> Delete your account and associated data
                                </p>
                                <p className="text-emerald-800 flex items-center gap-2">
                                    <span>✅</span> Opt-out of marketing communications
                                </p>
                                <p className="text-emerald-800 flex items-center gap-2">
                                    <span>✅</span> Disable WhatsApp notifications
                                </p>
                            </div>
                            <p className="mt-4 text-[#2D3A26]/80 leading-relaxed">
                                To exercise these rights, contact us at{' '}
                                <a href="mailto:privacy@kurimasense.com" className="text-[#2D3A26] underline">
                                    privacy@kurimasense.com
                                </a>
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">6. Cookies & Tracking</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                We use essential cookies for authentication and session management. 
                                We may use analytics cookies to understand how farmers use our platform. 
                                You can disable non-essential cookies in your browser settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">7. Children's Privacy</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                KurimaSense is not intended for use by children under 18. We do not knowingly 
                                collect personal information from children.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                We retain your data for as long as your account is active. Yield history and 
                                field data are kept to provide long-term trend analysis. You can request deletion 
                                at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">9. Changes to This Policy</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                We may update this policy periodically. We will notify you of significant changes 
                                via email or in-app notification. Continued use after changes constitutes acceptance.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                For privacy-related questions or to exercise your rights:
                            </p>
                            <div className="mt-4 bg-slate-100 rounded-xl p-4">
                                <p className="text-[#2D3A26]/80">
                                    <strong>Email:</strong>{' '}
                                    <a href="mailto:privacy@kurimasense.com" className="text-[#2D3A26] underline">
                                        privacy@kurimasense.com
                                    </a>
                                </p>
                                <p className="text-[#2D3A26]/80 mt-2">
                                    <strong>Data Protection Officer:</strong> Available upon request
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Links */}
                    <div className="mt-12 pt-8 border-t border-[#2D3A26]/10">
                        <p className="text-sm text-[#2D3A26]/60 mb-4">Related Documents:</p>
                        <div className="flex flex-wrap gap-4">
                            <Link 
                                href="/terms" 
                                className="px-4 py-2 bg-[#2D3A26]/10 rounded-lg text-[#2D3A26] hover:bg-[#2D3A26]/20 transition-colors text-sm font-medium"
                            >
                                Terms of Service
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-[#2D3A26]/60">
                            © 2026 KurimaSense. All rights reserved.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
