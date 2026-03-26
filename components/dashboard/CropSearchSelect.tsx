"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';

// Crop categories with display labels and local names
const CROP_CATALOG = [
    { group: "Cereals & Grains", crops: [
        { value: "Maize", label: "Maize", aka: "Chibage" },
        { value: "Wheat", label: "Wheat", aka: "Gorosi" },
        { value: "Sorghum", label: "Sorghum", aka: "Mapfunde" },
        { value: "Finger Millet", label: "Finger Millet", aka: "Rapoko / Zviyo" },
        { value: "Pearl Millet", label: "Pearl Millet", aka: "Mhunga" },
    ]},
    { group: "Cash Crops", crops: [
        { value: "Tobacco", label: "Tobacco", aka: "Fodya" },
        { value: "Cotton", label: "Cotton", aka: "Donje" },
        { value: "Sunflower", label: "Sunflower", aka: "" },
        { value: "Paprika", label: "Paprika / Chillies", aka: "" },
        { value: "Sesame", label: "Sesame", aka: "Runinga" },
        { value: "Tea", label: "Tea", aka: "" },
    ]},
    { group: "Legumes & Oilseeds", crops: [
        { value: "Soybeans", label: "Soybeans", aka: "" },
        { value: "Groundnuts", label: "Groundnuts", aka: "Nzungu" },
        { value: "Sugar Beans", label: "Sugar Beans", aka: "" },
        { value: "Cowpeas", label: "Cowpeas", aka: "Nyemba" },
        { value: "Bambara Nuts", label: "Bambara Nuts", aka: "Nyimo" },
        { value: "Peas", label: "Peas", aka: "" },
        { value: "Green Beans", label: "Green Beans", aka: "" },
    ]},
    { group: "Vegetables & Root Crops", crops: [
        { value: "Potato", label: "Potato", aka: "Mbatatisi" },
        { value: "Sweet Potato", label: "Sweet Potato", aka: "Mbambaira" },
        { value: "Cassava", label: "Cassava", aka: "Mujumbu" },
        { value: "Tomato", label: "Tomato", aka: "Domasi" },
        { value: "Onion", label: "Onion", aka: "Hanyanisi" },
        { value: "Cabbage", label: "Cabbage", aka: "Kabichi" },
        { value: "Butternut", label: "Butternut / Pumpkin", aka: "Nhanga" },
        { value: "Green Pepper", label: "Green Pepper", aka: "" },
        { value: "Garlic", label: "Garlic", aka: "" },
    ]},
    { group: "Export Horticulture & Fruits", crops: [
        { value: "Snow Peas", label: "Snow Peas / Mange Tout", aka: "" },
        { value: "Blueberries", label: "Blueberries", aka: "" },
        { value: "Strawberries", label: "Strawberries", aka: "" },
    ]},
];

// Flatten for search
const ALL_CROPS = CROP_CATALOG.flatMap(g => g.crops.map(c => ({ ...c, group: g.group })));

interface CropSearchSelectProps {
    value: string;
    onChange: (value: string) => void;
}

const CropSearchSelect: React.FC<CropSearchSelectProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Filter crops based on search
    const filtered = useMemo(() => {
        if (!search.trim()) return CROP_CATALOG;
        const q = search.toLowerCase();
        return CROP_CATALOG.map(group => ({
            ...group,
            crops: group.crops.filter(c =>
                c.value.toLowerCase().includes(q) ||
                c.label.toLowerCase().includes(q) ||
                c.aka.toLowerCase().includes(q) ||
                c.group.toLowerCase().includes(q)
            )
        })).filter(g => g.crops.length > 0);
    }, [search]);

    const selectedCrop = ALL_CROPS.find(c => c.value === value);

    const handleSelect = (cropValue: string) => {
        onChange(cropValue);
        setSearch("");
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Selected display / Search input */}
            <div
                className="w-full bg-slate-100 rounded-xl p-3 flex items-center gap-2 cursor-pointer hover:bg-slate-200/70 transition-colors"
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }}
            >
                {isOpen ? (
                    <div className="flex items-center gap-2 w-full">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none font-bold text-brand-dark placeholder:text-slate-400 placeholder:font-medium text-sm"
                            placeholder="Search crops... e.g. maize, nyimo, tobacco"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Escape") {
                                    setIsOpen(false);
                                    setSearch("");
                                }
                                // Select first match on Enter
                                if (e.key === "Enter" && filtered.length > 0 && filtered[0].crops.length > 0) {
                                    handleSelect(filtered[0].crops[0].value);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-brand-dark text-sm">
                            {selectedCrop ? selectedCrop.label : "Select crop..."}
                            {selectedCrop?.aka && (
                                <span className="text-slate-400 font-medium ml-1.5">({selectedCrop.aka})</span>
                            )}
                        </span>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-64 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">
                            No crops matching &ldquo;{search}&rdquo;
                        </div>
                    ) : (
                        filtered.map(group => (
                            <div key={group.group}>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">
                                    {group.group}
                                </div>
                                {group.crops.map(crop => (
                                    <button
                                        key={crop.value}
                                        type="button"
                                        onClick={() => handleSelect(crop.value)}
                                        className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-brand-lime/20 transition-colors ${
                                            value === crop.value ? 'bg-brand-lime/10 font-black' : 'font-medium'
                                        }`}
                                    >
                                        <span className="text-sm text-brand-dark">
                                            {crop.label}
                                            {crop.aka && (
                                                <span className="text-slate-400 font-normal ml-1.5 text-xs">({crop.aka})</span>
                                            )}
                                        </span>
                                        {value === crop.value && (
                                            <svg className="w-4 h-4 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default CropSearchSelect;
