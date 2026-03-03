'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function TermsOfServicePage() {
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
                    <h1 className="text-4xl font-bold text-[#2D3A26] mb-2">Terms of Service</h1>
                    <p className="text-[#2D3A26]/60">Last updated: February 5, 2026</p>
                </div>

                {/* Content Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl border border-[#2D3A26]/10">
                    
                    {/* Disclaimer Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
                        <div className="flex gap-4">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-bold text-amber-800 mb-2">Agricultural Advisory Disclaimer</h3>
                                <p className="text-amber-700 text-sm">
                                    KurimaSense provides AI-powered agricultural information for educational and 
                                    informational purposes only. Please read these terms carefully.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-8 text-[#2D3A26]">
                        
                        <section>
                            <h2 className="text-2xl font-bold mb-4">1. Service Description</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                KurimaSense is an AI-powered precision agriculture platform designed to assist 
                                Zimbabwean farmers with crop management decisions. Our services include:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Satellite-based field monitoring and NDVI analysis</li>
                                <li>AI agronomist chat for farming advice</li>
                                <li>Yield projections and growth stage tracking</li>
                                <li>Weather-integrated disease risk alerts</li>
                                <li>Variety-specific recommendations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">2. Important Limitations</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                The information provided by KurimaSense should <strong>NOT</strong> be considered as:
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                                <p className="text-red-800 flex items-center gap-2">
                                    <span>❌</span> Professional agronomic advice from a licensed agronomist
                                </p>
                                <p className="text-red-800 flex items-center gap-2">
                                    <span>❌</span> Guaranteed yield predictions or financial projections
                                </p>
                                <p className="text-red-800 flex items-center gap-2">
                                    <span>❌</span> Definitive disease or pest diagnoses
                                </p>
                                <p className="text-red-800 flex items-center gap-2">
                                    <span>❌</span> Licensed pesticide or chemical application recommendations
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">3. Yield Projections</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                All yield projections are <strong>estimates only</strong>, based on:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Variety-specific yield potentials from our database</li>
                                <li>Satellite imagery (NDVI) analysis</li>
                                <li>Weather data and patterns</li>
                                <li>Regional adjustment factors</li>
                            </ul>
                            <p className="mt-4 text-[#2D3A26]/80 leading-relaxed">
                                Actual results will vary based on weather conditions, pest and disease pressure, 
                                input quality, and farm management practices. <strong>Do not make financial 
                                decisions (loans, contracts, land purchases)</strong> based solely on our projections.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">4. Chemical & Pesticide Information</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                For any pesticide, herbicide, fungicide, or fertilizer mentioned in our platform:
                            </p>
                            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-2">
                                <p className="text-yellow-800 flex items-start gap-2">
                                    <span className="mt-1">📋</span> 
                                    <span>Always read and follow the product label instructions</span>
                                </p>
                                <p className="text-yellow-800 flex items-start gap-2">
                                    <span className="mt-1">🧤</span> 
                                    <span>Wear appropriate PPE (protective clothing, gloves, mask, goggles)</span>
                                </p>
                                <p className="text-yellow-800 flex items-start gap-2">
                                    <span className="mt-1">✅</span> 
                                    <span>Verify registration status with Zimbabwe's Agricultural Marketing Authority (AMA)</span>
                                </p>
                                <p className="text-yellow-800 flex items-start gap-2">
                                    <span className="mt-1">👨‍🌾</span> 
                                    <span>Consult certified agronomists or Agritex officers for application rates</span>
                                </p>
                                <p className="text-yellow-800 flex items-start gap-2">
                                    <span className="mt-1">⏰</span> 
                                    <span>Observe pre-harvest intervals before marketing produce</span>
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">5. Disease Identification</h2>
                            <p className="mb-4 text-[#2D3A26]/80 leading-relaxed">
                                Our AI-assisted disease identification is a <strong>preliminary assessment only</strong>. 
                                For confirmation of any suspected disease:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-[#2D3A26]/80 ml-4">
                                <li>Collect samples and submit to plant pathology laboratories</li>
                                <li>Contact your local Agritex extension officer</li>
                                <li>Do not apply treatments based solely on AI assessment for high-value crops</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">6. Market Prices</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                Market prices displayed are <strong>indicative only</strong> and sourced from available 
                                public data. Actual prices vary by buyer, location, quality grade, and market conditions. 
                                Always verify with actual buyers before making sales decisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">7. User Responsibility</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                By using KurimaSense, you acknowledge that <strong>all agricultural decisions are 
                                ultimately your responsibility</strong>. We recommend consulting with local Agritex 
                                extension officers, certified agronomists, and agricultural authorities for critical 
                                decisions affecting your livelihood.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
                            <div className="bg-slate-100 rounded-xl p-6">
                                <p className="text-[#2D3A26]/80 leading-relaxed">
                                    <strong>KurimaSense, its operators, and affiliates shall not be liable for any 
                                    crop losses, financial damages, health impacts, environmental damage, or other 
                                    consequences arising from use of this platform's information and recommendations.</strong>
                                </p>
                                <p className="mt-4 text-[#2D3A26]/80 leading-relaxed">
                                    The platform is provided "as is" without warranties of any kind. We do not guarantee 
                                    the accuracy, completeness, or timeliness of any information provided.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">9. Data Privacy</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                Your farm data, field locations, and usage information are protected under our 
                                <Link href="/privacy" className="text-[#2D3A26] underline hover:text-[#D7F26C] ml-1">
                                    Privacy Policy
                                </Link>. 
                                We use this data to improve our services and provide personalized recommendations.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
                            <p className="text-[#2D3A26]/80 leading-relaxed">
                                For questions about these terms, contact us at: 
                                <a href="mailto:support@kurimasense.com" className="text-[#2D3A26] underline ml-1">
                                    support@kurimasense.com
                                </a>
                            </p>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-[#2D3A26]/10 text-center">
                        <p className="text-sm text-[#2D3A26]/60">
                            © 2026 KurimaSense. All rights reserved.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
