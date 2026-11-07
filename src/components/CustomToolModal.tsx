import React, { useState } from 'react';
import { CustomTool, SymbolKind } from '../types';
import { X, Plus, Trash2, Pin, PinOff, Check, Wrench } from 'lucide-react';

interface CustomToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTools: CustomTool[];
  setCustomTools: React.Dispatch<React.SetStateAction<CustomTool[]>>;
  onSelectTool?: (toolId: string) => void;
}

export const CustomToolModal: React.FC<CustomToolModalProps> = ({
  isOpen,
  onClose,
  customTools,
  setCustomTools,
  onSelectTool,
}) => {
  const [newToolName, setNewToolName] = useState('');
  const [newToolLabel, setNewToolLabel] = useState('');
  const [newToolColor, setNewToolColor] = useState('#0284c7');
  const [newToolShape, setNewToolShape] = useState<'circle' | 'rect' | 'custom_icon'>('circle');

  if (!isOpen) return null;

  const colorPresets = [
    '#0284c7', // Sky
    '#dc2626', // Red
    '#16a34a', // Green
    '#ea580c', // Orange
    '#9333ea', // Purple
    '#0f172a', // Slate/Black
    '#ca8a04', // Gold
    '#0891b2', // Cyan
  ];

  const handleAddTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToolName.trim()) return;

    const newTool: CustomTool = {
      id: `ct-${Date.now()}`,
      name: newToolName.trim(),
      symbolKind: 'custom',
      iconName: 'Wrench',
      color: newToolColor,
      defaultLabel: newToolLabel.trim() || newToolName.trim().slice(0, 3),
      shapeType: newToolShape,
      pinned: true,
    };

    setCustomTools((prev) => [...prev, newTool]);
    setNewToolName('');
    setNewToolLabel('');
  };

  const handleTogglePin = (id: string) => {
    setCustomTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    );
  };

  const handleDeleteTool = (id: string) => {
    setCustomTools((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">إضافة أدوات ورموز مخصصة للتثبيت</h2>
              <p className="text-xs text-slate-400">
                أنشئ أدوات جديدة وثبتها في شريط الأدوات العلوي لإدراجها في الرسم مباشرة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form to create new tool */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>إنشاء أداة / رمز مساحي جديد</span>
          </h3>

          <form onSubmit={handleAddTool} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الأداة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عامود إنارة، ماسورة حماية..."
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  النص أو الرمز المكتوب على الشكل
                </label>
                <input
                  type="text"
                  placeholder="مثال: LP، MH، 20M..."
                  value={newToolLabel}
                  onChange={(e) => setNewToolLabel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Shape Selection */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">شكل الرمز:</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewToolShape('circle')}
                    className={`px-2 py-1 rounded transition-colors ${
                      newToolShape === 'circle'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    دائرة
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewToolShape('rect')}
                    className={`px-2 py-1 rounded transition-colors ${
                      newToolShape === 'rect'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    مربع
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewToolShape('custom_icon')}
                    className={`px-2 py-1 rounded transition-colors ${
                      newToolShape === 'custom_icon'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    رمز أيقونة
                  </button>
                </div>
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700">اللون:</span>
                <div className="flex items-center gap-1">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewToolColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newToolColor === c ? 'scale-125 ring-2 ring-emerald-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وتثبيت في شريط الأدوات</span>
              </button>
            </div>
          </form>
        </div>

        {/* Existing Custom Tools List */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-800 mb-3">
            الأدوات والرموز الحالية المثبتة ({customTools.length}):
          </h3>

          <div className="space-y-2">
            {customTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                    style={{ backgroundColor: tool.color }}
                  >
                    {tool.defaultLabel.slice(0, 3)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{tool.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      رمز: {tool.defaultLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(tool.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      tool.pinned
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                    title={tool.pinned ? 'إلغاء التثبيت من الشريط' : 'تثبيت في الشريط'}
                  >
                    {tool.pinned ? (
                      <>
                        <Pin className="w-3.5 h-3.5 text-amber-600" />
                        <span>مثبت</span>
                      </>
                    ) : (
                      <>
                        <PinOff className="w-3.5 h-3.5" />
                        <span>غير مثبت</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTool(tool.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="حذف الأداة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
