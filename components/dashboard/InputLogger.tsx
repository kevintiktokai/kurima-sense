"use client";

import React, { useState } from 'react';
import { api } from '@/services/api';
import { useDashboardData } from '@/components/providers/DashboardDataProvider';

interface InputLoggerProps {
    onClose: () => void;
    onSuccess: () => void;
}

const InputLogger: React.FC<InputLoggerProps> = ({ onClose, onSuccess }) => {
    const { fields } = useDashboardData();
    const [selectedField, setSelectedField] = useState('');
    const [inputType, setInputType] = useState('Plants');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('Count');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedField || !quantity) return;
        setLoading(true);
        try {
            await api.logInput({
                field_id: selectedField,
                input_type: inputType,
                quantity: parseFloat(quantity),
                unit: unit
            });
            alert("Input Logged Successfully! Yield projections updated.");
            onSuccess();
            onClose();
        } catch (e) {
            alert("Failed to log input.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(45, 58, 48, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-[24px] p-8" style={{ backgroundColor: 'var(--ee-surface)', boxShadow: 'var(--shadow-ambient)' }}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--ee-text)' }}>Log Farm Inputs</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--ee-bg)', color: 'var(--ee-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold uppercase ml-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Select Field</label>
                        <select
                            className="w-full p-4 rounded-[16px] font-bold text-sm outline-none"
                            style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                            value={selectedField}
                            onChange={e => setSelectedField(e.target.value)}
                        >
                            <option value="">-- Choose Field --</option>
                            {fields.map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase ml-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Type</label>
                            <select
                                className="w-full p-4 rounded-[16px] font-bold text-sm outline-none"
                                style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                value={inputType}
                                onChange={e => {
                                    setInputType(e.target.value);
                                    if (e.target.value === 'Plants') setUnit('Count');
                                    else if (e.target.value === 'Fertilizer') setUnit('kg');
                                }}
                            >
                                <option value="Plants">Plants Planted</option>
                                <option value="Fertilizer">Fertilizer</option>
                                <option value="Pesticide">Pesticide</option>
                                <option value="Labor">Labor Hours</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase ml-3" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>Quantity</label>
                            <input
                                type="number"
                                className="w-full p-4 rounded-[16px] font-bold text-sm outline-none"
                                style={{ backgroundColor: 'var(--ee-bg)', boxShadow: 'var(--shadow-neu-inset)', color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}
                                placeholder="0.00"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-[16px]" style={{ backgroundColor: 'rgba(15, 184, 133, 0.06)' }}>
                        <p className="text-xs font-medium text-center" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            Logging <span className="font-bold" style={{ color: 'var(--ee-text)' }}>{inputType}</span> helps the AI Agronomist calculate your potential yield more accurately.
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedField || !quantity}
                        className="w-full py-4 rounded-[16px] font-bold transition-all disabled:opacity-50"
                        style={{
                            backgroundColor: 'var(--ee-primary)',
                            color: '#fff',
                            boxShadow: 'var(--shadow-neu)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {loading ? 'Logging...' : 'Confirm Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputLogger;
