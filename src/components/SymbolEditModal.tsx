import React, { useState, useEffect, useRef } from 'react';
import { CanvasElement } from '../types';
import { X, Check, Tag, Compass, Sparkles, SlidersHorizontal } from 'lucide-react';

interface SymbolEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  element: CanvasElement | null;
  onSave: (updatedElement: CanvasElement) => void;
}

export const SymbolEditModal: React.FC<SymbolEditModalProps> = ({
  isOpen,
  onClose,
  element,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [isBoxed, setIsBoxed] = useState(true);
  const [fontSize, setFontSize] = useState(12);
  const [subTop, setSubTop] = useState('');
  const [subBottom, setSubBottom] = useState('');

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (element) {
      const initialLabel = element.label ?? element.text ?? element.symbolName ?? '';
      setName(initialLabel);
      setPosition(
        (element.labelPosition as 'top' | 'bottom' | 'left' | 'right') ||
          (element.symbolKind === 'sp' || element.symbolKind === 'north_arrow' ? 'top' : 'bottom')
      );
      setIsBoxed(element.isBoxed ?? true);
      setFontSize(element.fontSize ?? 12);
      setSubTop(element.subscriptionTop || (initialLabel.split('/')[0]) || '2658');
      setSubBottom(element.subscriptionBottom || (initialLabel.split('/')[1]) || '3853');

      // Autofocus input after opening
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [element, isOpen]);

  if (!isOpen || !element) return null;

  const isSubscription = element.symbolKind === 'subscription';

  const getSymbolTitle = () => {
    switch (element.symbolKind) {
      case 'sp':
        return 'نقطة خدمة SP';
      case 'substation':
        return 'محطة تحويل بخطين عكسيين ⤫';
      case 'cabinet':
      case 'substation_cross':
        return 'كابينة توزيع C مثلثية';
      case 'joint':
        return 'لحام / مفصل كيبل';
      case 'north_arrow':
        return 'سهم الشمال N';
      case 'subscription':
        return 'رمز الاشتراك والعداد (2658/3853)';
      default:
        return element.type === 'custom_symbol' ? 'رمز مخصص' : 'رمز هندسي';
    }
  };

  const getPresets = () => {
    switch (element.symbolKind) {
      case 'sp':
        return ['SP', 'SP 1', 'SP 2', 'SP 101', 'SP 102', 'نقطة تغذية'];
      case 'substation':
        return ['محطة 973018', 'محطة 973019', 'محطة تحويل', 'محطة فرعية 1', 'محطة 11KV'];
      case 'cabinet':
      case 'substation_cross':
        return ['كابينة C973018/5', 'كابينة C1', 'كابينة C2', 'كابينة توزيع', 'كابينة 100A'];
      case 'joint':
        return ['لحام 70', 'لحام 185', 'لحام 300', 'مفصل أرضي'];
      case 'north_arrow':
        return ['N', 'شمال', 'الاتجاه الشمالي'];
      case 'subscription':
        return ['2658 / 3853', 'اشتراك سكني', 'اشتراك تجاري'];
      default:
        return ['عمود 15', 'منهل 2', 'صندوق توزيع', 'محول'];
    }
  };

  const handleApply = () => {
    const trimmed = name.trim();
    let finalLabel = trimmed;

    if (isSubscription) {
      const top = subTop.trim() || '2658';
      const btm = subBottom.trim() || '3853';
      finalLabel = trimmed || `${top}/${btm}`;
    }

    const updated: CanvasElement = {
      ...element,
      label: finalLabel,
      text: finalLabel,
      symbolName: finalLabel,
      labelPosition: position,
      isBoxed,
      fontSize,
      subscriptionTop: isSubscription ? subTop.trim() : element.subscriptionTop,
      subscriptionBottom: isSubscription ? subBottom.trim() : element.subscriptionBottom,
    };

    onSave(updated);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Cairo',sans-serif]"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">تعديل اسم أو رقم الرمز</h3>
              <p className="text-[11px] text-amber-300 font-medium">{getSymbolTitle()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Main Name / Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>اسم أو رقم الرمز:</span>
              <span className="text-[10px] text-slate-400 font-normal">يظهر مباشرة بجوار الرمز على المخطط</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب الاسم أو الرقم (مثال: SP 104 أو محطة 973018 أو كابينة 3)..."
                className="w-full bg-amber-50/50 border-2 border-amber-400 focus:border-amber-600 rounded-xl px-3.5 py-2.5 font-bold text-sm text-slate-900 shadow-inner focus:ring-4 focus:ring-amber-500/20 outline-hidden transition-all"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                  title="مسح النص"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* If Subscription: separate top and bottom inputs */}
          {isSubscription && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>أرقام كسر الاشتراك والعداد (صورة 5583):</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                    الرقم العلوي (رقم الاشتراك):
                  </label>
                  <input
                    type="text"
                    value={subTop}
                    onChange={(e) => setSubTop(e.target.value)}
                    placeholder="2658"
                    className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                    الرقم السفلي (رقم العداد):
                  </label>
                  <input
                    type="text"
                    value={subBottom}
                    onChange={(e) => setSubBottom(e.target.value)}
                    placeholder="3853"
                    className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>اقتراحات سريعة بنقرة واحدة:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {getPresets().map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    name === preset
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-amber-100 hover:text-amber-900 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Label Position beside symbol */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              موضع الاسم أو الرقم بجوار الرمز:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'top', label: 'أعلى ⬆' },
                { id: 'bottom', label: 'أسفل ⬇' },
                { id: 'right', label: 'يمين ➔' },
                { id: 'left', label: 'يسار ⬅' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setPosition(pos.id as any)}
                  className={`py-2 px-1 rounded-xl font-bold text-center border transition-all text-xs flex flex-col items-center justify-center gap-0.5 ${
                    position === pos.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style & Boxed Halo Toggle */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
              <input
                type="checkbox"
                checked={isBoxed}
                onChange={(e) => setIsBoxed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 accent-amber-600"
              />
              <span>إطار وخلفية بيضاء للنص (لتسهيل القراءة فوق الخطوط)</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-bold">الحجم:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-xs"
              >
                <option value={10}>10px (صغير)</option>
                <option value={12}>12px (قياسي)</option>
                <option value={14}>14px (واضح)</option>
                <option value={16}>16px (كبير)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200 font-bold text-xs transition-colors"
          >
            إلغاء (Esc)
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-md transition-all"
          >
            <Check className="w-4 h-4" />
            <span>حفظ وتطبيق الاسم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
