"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import "driver.js/dist/driver.css";
import type { DriveStep } from 'driver.js';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { usePathname } from 'next/navigation';

// Lazy-load driver.js JS only when a tutorial actually runs (~30KB JS savings).
// CSS stays top-level since dynamic CSS imports are unreliable in Next.js.
type DriverInstance = ReturnType<typeof import('driver.js')['driver']>;
type DriverFactory = typeof import('driver.js')['driver'];

let _driverLoader: Promise<DriverFactory> | null = null;
const loadDriver = (): Promise<DriverFactory> => {
    if (!_driverLoader) {
        _driverLoader = import('driver.js').then(mod => mod.driver);
    }
    return _driverLoader;
};

interface TutorialContextType {
    startTutorial: () => void;
    isRunning: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error("useTutorial must be used within a TutorialProvider");
    }
    return context;
};

// Define steps for each route
const tourConfig: Record<string, DriveStep[]> = {
    '/dashboard': [
        {
            element: '#sidebar-nav',
            popover: {
                title: 'Welcome to KurimaSense! 🌿',
                description: 'This is your main navigation hub. Access your dashboard, fields, weather, and settings from here.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#dashboard-welcome',
            popover: {
                title: 'Your Daily Dashboard',
                description: 'Get a quick overview of your farm status, active fields, and total hectarage.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#action-queue',
            popover: {
                title: 'Action Queue 📋',
                description: 'Stay on top of your tasks! This area lists high-priority actions derived from AI insights and field data.',
                side: "left",
                align: 'start'
            }
        },
        {
            element: '#weather-widget-dashboard', // Ensure dashboard overview has this or general widget
            popover: {
                title: 'Weather Glance 🌦️',
                description: 'Quick check on current weather conditions for your farm. Click for more details.',
                side: "left",
                align: 'start'
            }
        },
        {
            element: '#ai-chat-interface',
            popover: {
                title: 'AI Agronomist 🤖',
                description: 'Chat with your AI Agronomist here. Ask about pests, fertilizers, or yield predictions.',
                side: "top",
                align: 'center'
            }
        }
    ],
    '/dashboard/plan': [
        {
            element: '#crop-plan-header',
            popover: {
                title: 'Crop Plan Overview 📊',
                description: 'View the current stage, projected yield, and gap analysis for your selected field.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#next-actions-card',
            popover: {
                title: 'Immediate Actions ⚡',
                description: 'These are the specific tasks you need to complete in the next 2 weeks to stay on track.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#growth-cycle-timeline',
            popover: {
                title: 'Growth Cycle Timeline 📅',
                description: 'Track the entire lifecycle of your crop from planting to harvest, with status updates.',
                side: "top",
                align: 'start'
            }
        }
    ],
    '/dashboard/fields': [
        {
            element: '#field-view-mode-toggle',
            popover: {
                title: 'Switch Views 🗺️',
                description: 'Toggle between Map View to see fields geographically or List View for details.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: '#add-field-btn',
            popover: {
                title: 'Add New Field ➕',
                description: 'Click here to draw a new field on the map and start tracking it.',
                side: "left",
                align: 'center'
            }
        },
        // We'll only show this if in map mode, but driver.js handles missing elements gracefully usually, or skipped
        {
            element: '#fields-map-container',
            popover: {
                title: 'Interactive Map 🌍',
                description: 'View your fields with satellite imagery. Click on a field polygon to see its health status.',
                side: "top",
                align: 'center'
            }
        }
    ],
    '/dashboard/weather': [
        {
            element: '#weather-widget-main',
            popover: {
                title: 'Detailed Weather Insights 🌦️',
                description: 'Comprehensive weather data including humidity, wind speed, and precipitation forecasts.',
                side: "bottom",
                align: 'center'
            }
        },
        {
            element: '#current-weather-section',
            popover: {
                title: 'Current Conditions 🌡️',
                description: 'Real-time temperature and conditions for your farm location.',
                side: "top",
                align: 'start'
            }
        },
        {
            element: '#forecast-row',
            popover: {
                title: '5-Day Forecast 📆',
                description: 'Plan ahead with the 5-day weather forecast to optimize planting and spraying.',
                side: "top",
                align: 'center'
            }
        }
    ],
    '/dashboard/settings': [
        {
            element: '#settings-container',
            popover: {
                title: 'Settings & Preferences ⚙️',
                description: 'Manage your personal details, language preferences, and notification settings here.',
                side: "top",
                align: 'center'
            }
        },
        {
            element: '#profile-header',
            popover: {
                title: 'Your Profile 👤',
                description: 'Your account summary and member status.',
                side: "bottom",
                align: 'center'
            }
        },
        {
            element: '#notifications-toggle',
            popover: {
                title: 'WhatsApp Advisory 📱',
                description: 'Enable this to receive weekly AI summaries and alerts directly on WhatsApp.',
                side: "top",
                align: 'center'
            }
        }
    ]
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile, updateProfile, loading } = useUserProfile();
    const [isRunning, setIsRunning] = useState(false);
    const driverObj = useRef<DriverInstance | null>(null);
    const pathname = usePathname();

    const handleTutorialComplete = useCallback(async (path: string) => {
        setIsRunning(false);
        if (profile) {
            const currentProgress = profile.tutorial_progress || {};
            if (!currentProgress[path]) {
                const newProgress = { ...currentProgress, [path]: true };
                await updateProfile({
                    tutorial_progress: newProgress,
                    has_seen_tutorial: true,
                });
            }
        }
    }, [profile, updateProfile]);

    const initDriver = useCallback(async (path: string) => {
        const steps = tourConfig[path];
        if (!steps || steps.length === 0) return null;

        const driverFactory = await loadDriver();
        const d = driverFactory({
            showProgress: true,
            animate: true,
            steps: steps,
            allowClose: true,
            onDestroyStarted: () => {
                if (!d.hasNextStep() || confirm("Skip the rest of this page's tutorial?")) {
                    d.destroy();
                    handleTutorialComplete(path);
                }
            }
        });
        driverObj.current = d;
        return d;
    }, [handleTutorialComplete]);

    const startTutorial = useCallback(async () => {
        const path = pathname || '/dashboard';
        const d = await initDriver(path);
        if (d) {
            setIsRunning(true);
            d.drive();
        } else if (path === '/') {
            const dashboardDriver = await initDriver('/dashboard');
            if (dashboardDriver) {
                setIsRunning(true);
                dashboardDriver.drive();
            }
        }
    }, [pathname, initDriver]);

    // Auto-trigger logic
    useEffect(() => {
        if (loading || !profile || !pathname) return;
        const progress = profile.tutorial_progress || {};
        const hasSeenThisRoute = progress[pathname];

        if (tourConfig[pathname] && !hasSeenThisRoute) {
            const timer = setTimeout(() => {
                startTutorial();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [loading, profile, pathname, startTutorial]);

    const value = useMemo(() => ({ startTutorial, isRunning }), [startTutorial, isRunning]);

    return (
        <TutorialContext.Provider value={value}>
            {children}
        </TutorialContext.Provider>
    );
};
