"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { driver, DriveStep } from 'driver.js';
import "driver.js/dist/driver.css";
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { usePathname } from 'next/navigation';

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
    const driverObj = useRef<ReturnType<typeof driver> | null>(null);
    const pathname = usePathname();

    const initDriver = (path: string) => {
        const steps = tourConfig[path];
        if (!steps || steps.length === 0) return null;

        const d = driver({
            showProgress: true,
            animate: true,
            steps: steps,
            allowClose: true,
            onDestroyStarted: () => {
                // If user closes it manually or it finishes
                if (!d.hasNextStep() || confirm("Skip the rest of this page's tutorial?")) {
                    d.destroy();
                    handleTutorialComplete(path);
                }
            }
        });
        driverObj.current = d;
        return d;
    };

    const handleTutorialComplete = async (path: string) => {
        setIsRunning(false);
        // Mark THIS specific path as seen
        if (profile) {
            const currentProgress = profile.tutorial_progress || {};
            if (!currentProgress[path]) {
                const newProgress = { ...currentProgress, [path]: true };
                console.log(`Marking tutorial for ${path} as seen...`, newProgress);

                // Also mark legacy boolean for backward compatibility if needed, but we rely on progress now
                await updateProfile({
                    tutorial_progress: newProgress,
                    has_seen_tutorial: true // Keep this true generally once allowed 
                });
            }
        }
    };

    const startTutorial = () => {
        // Start tutorial for CURRENT path
        const path = pathname || '/dashboard';
        const d = initDriver(path);
        if (d) {
            setIsRunning(true);
            d.drive();
        } else {
            // Fallback or notification that no tutorial exists for this page
            console.log("No tutorial defined for this route:", path);
            // Try default dashboard if on root?
            if (path === '/') {
                const dashboardDriver = initDriver('/dashboard');
                if (dashboardDriver) {
                    setIsRunning(true);
                    dashboardDriver.drive();
                }
            }
        }
    };

    // Auto-trigger logic
    useEffect(() => {
        if (loading || !profile || !pathname) return;

        // Check if user has seen tutorial for THIS specific route
        const progress = profile.tutorial_progress || {};
        // Also check legacy flag - if they saw the old full tutorial, maybe we don't annoy them? 
        // But the user requested "custom tutorial for every page", so we assume they should see page-specific ones.
        // We will strictly check the route progress.

        const hasSeenThisRoute = progress[pathname];

        // Only auto-trigger if we have steps for this route AND haven't seen it
        if (tourConfig[pathname] && !hasSeenThisRoute) {
            const timer = setTimeout(() => {
                console.log(`Auto-starting tutorial for route: ${pathname}`);
                startTutorial();
            }, 1500); // Slightly longer delay to let page load/animations finish
            return () => clearTimeout(timer);
        }
    }, [loading, profile, pathname]);

    return (
        <TutorialContext.Provider value={{ startTutorial, isRunning }}>
            {children}
        </TutorialContext.Provider>
    );
};
