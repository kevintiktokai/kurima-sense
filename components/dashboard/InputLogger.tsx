"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FieldData } from './types';

interface InputLoggerProps {
    onClose: () => void;
    onSuccess: () => void;
}

const InputLogger: React.FC<InputLoggerProps> = ({ onClose, onSuccess }) => {
    const [fields, setFields] = useState<FieldData[]>([]);
    const [selectedField, setSelectedField] = useState('');
    const [inputType, setInputType] = useState('Plants');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('Count');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getFields().then(setFields);
    }, []);

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
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-brand-dark">Log Farm Inputs</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-brand-dark font-bold text-xl">×</button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase ml-3">Select Field</label>
                        <select
                            className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-brand-dark focus:border-brand-lime outline-none"
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
                            <label className="text-xs font-bold text-slate-400 uppercase ml-3">Type</label>
                            <select
                                className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-brand-dark focus:border-brand-lime outline-none"
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
                            <label className="text-xs font-bold text-slate-400 uppercase ml-3">Quantity</label>
                            <input
                                type="number"
                                className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-brand-dark focus:border-brand-lime outline-none"
                                placeholder="0.00"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-brand-light/30 rounded-2xl border border-brand-lime/20">
                        <p className="text-xs text-brand-dark/70 font-medium text-center">
                            Logging <span className="font-bold">{inputType}</span> helps the AI Agronomist calculate your potential yield more accurately.
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedField || !quantity}
                        className="w-full py-4 bg-brand-dark text-brand-lime rounded-2xl font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? 'Logging...' : 'Confirm Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputLogger;
