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
        { value: "Coffee", label: "Coffee", aka: "Kofi" },
        { value: "Macadamia", label: "Macadamia Nuts", aka: "" },
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
        { value: "Carrot", label: "Carrot", aka: "Karoti" },
        { value: "Covo", label: "Covo (Ethiopian Kale)", aka: "Muriwo" },
        { value: "Mustard", label: "Mustard Greens", aka: "Tsunga" },
        { value: "Rape", label: "Rape", aka: "Muriwo weRape" },
    ]},
    { group: "Export Horticulture & Fruits", crops: [
        { value: "Snow Peas", label: "Snow Peas / Mange Tout", aka: "" },
        { value: "Blueberries", label: "Blueberries", aka: "" },
        { value: "Strawberries", label: "Strawberries", aka: "" },
        { value: "Avocado", label: "Avocado", aka: "" },
        { value: "Banana", label: "Banana", aka: "Bhanana" },
        { value: "Citrus", label: "Citrus (Oranges/Lemons)", aka: "" },
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
                group.group.toLowerCase().includes(q)
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
                className="w-full rounded-[16px] p-3 flex items-center gap-2 cursor-pointer transition-colors"
                style={{
                    backgroundColor: 'var(--ee-bg)',
                    boxShadow: 'var(--shadow-neu-inset)',
                }}
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }}
            >
                {isOpen ? (
                    <div className="flex items-center gap-2 w-full">
                        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '18px', color: 'var(--ee-muted)' }}>search</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 bg-transparent outline-none text-sm font-bold"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                            placeholder="Search crops... e.g. maize, nyimo, tobacco"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Escape") {
                                    setIsOpen(false);
                                    setSearch("");
                                }
                                if (e.key === "Enter" && filtered.length > 0 && filtered[0].crops.length > 0) {
                                    handleSelect(filtered[0].crops[0].value);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                            {selectedCrop ? selectedCrop.label : "Select crop..."}
                            {selectedCrop?.aka && (
                                <span className="font-medium ml-1.5" style={{ color: 'var(--ee-muted)' }}>({selectedCrop.aka})</span>
                            )}
                        </span>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--ee-muted)' }}>expand_more</span>
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-[16px] max-h-64 overflow-y-auto z-50"
                    style={{
                        backgroundColor: 'var(--ee-surface)',
                        boxShadow: 'var(--shadow-ambient)',
                    }}
                >
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            No crops matching &ldquo;{search}&rdquo;
                        </div>
                    ) : (
                        filtered.map(group => (
                            <div key={group.group}>
                                <div
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0"
                                    style={{ color: 'var(--ee-muted)', backgroundColor: 'var(--ee-bg)', fontFamily: 'var(--font-body)' }}
                                >
                                    {group.group}
                                </div>
                                {group.crops.map(crop => (
                                    <button
                                        key={crop.value}
                                        type="button"
                                        onClick={() => handleSelect(crop.value)}
                                        className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors"
                                        style={{
                                            backgroundColor: value === crop.value ? 'rgba(15, 184, 133, 0.08)' : 'transparent',
                                            fontWeight: value === crop.value ? 700 : 500,
                                        }}
                                    >
                                        <span className="text-sm" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                                            {crop.label}
                                            {crop.aka && (
                                                <span className="font-normal ml-1.5 text-xs" style={{ color: 'var(--ee-muted)' }}>({crop.aka})</span>
                                            )}
                                        </span>
                                        {value === crop.value && (
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--ee-primary)' }}>check</span>
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
