import React from 'react';
import { CanvasElement, SoilType } from '../types';
import {
  getLineLengthInfo,
} from '../utils/lineLengthUtils';
import {
  X,
  Sliders,
  Ruler,
  Sparkles,
  Trash2,
  Check,
  Type,
  Palette,
} from 'lucide-react';

interface ElementPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  element: CanvasElement | null;
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onResizeLine: (lineId: string, targetMeters: number) => void;
  onDeleteElement: (id: string) => void;
  onAutoCalculateLengths?: () => void;
  inspectorAnchor: 'start' | 'end' | 'center';
  setInspectorAnchor: (anchor: 'start' | 'end' | 'center') => void;
  moveConnectedSymbols: boolean;
  setMoveConnectedSymbols: (val: boolean | ((prev: boolean) => boolean)) => void;
  autoSyncWorkOrder: boolean;
  setAutoSyncWorkOrder: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const ElementPropertiesModal: React.FC<ElementPropertiesModalProps> = ({
  isOpen,
  onClose,
  element,
  elements,
  onElementsChange,
  onResizeLine,
  onDeleteElement,
  onAutoCalculateLengths,
  inspectorAnchor,
  setInspectorAnchor,
  moveConnectedSymbols,
  setMoveConnectedSymbols,
  autoSyncWorkOrder,
  setAutoSyncWorkOrder,
}) => {
  if (!isOpen || !element) return null;

  const lengthInfo = getLineLengthInfo(element);
  const currentMeters = lengthInfo ? lengthInfo.lengthMeters : 0;

  const getElementTypeName = (el: CanvasElement) => {
    switch (el.type) {
      case 'line':
        if (el.strokeStyle === 'dashed') return 'خط متقطع (كيبل منقوط مع الطول)';
        if (el.isMilling || el.soilType === 'KASHT') return 'مسار كشط مع كيبل {5584}';
        if (el.soilType === 'AS') return 'كيبل أسفلت {AS}';
        if (el.soilType === 'NG') return 'كيبل ترابي {NG}';
        if (el.soilType === 'T') return 'كيبل بلاط {T}';
        return 'خط مستقيم / مسار شارع';
      case 'dimension':
        return 'قياس مسافة وبُعد';
      case 'symbol':
        if (el.symbolKind === 'substation') return 'محطة تحويل بخطين عكسيين ⤫';
        if (el.symbolKind === 'cabinet') return 'كابينة توزيع C مثلثية';
        if (el.symbolKind === 'sp') return 'نقطة خدمة SP';
        if (el.symbolKind === 'joint') return 'مفصل لحام كيبل';
        if (el.symbolKind === 'subscription') return 'رمز اشتراك / عداد كهرباء (2658/3853)';
        if (el.symbolKind === 'north_arrow') return 'سهم الشمال N';
        return `رمز مساحي (${el.symbolKind || 'رمز'})`;
      case 'textbox':
        return 'مربع نصي (Text Box)';
      case 'text':
        return 'نص حر';
      case 'rect':
        return 'مستطيل / غرفة';
      case 'circle':
        return 'دائرة / منهل';
      default:
        return el.type;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto font-['Cairo',sans-serif] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 my-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>خصائص العنصر المحدد</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {getElementTypeName(element)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Symbol Name & Number Configuration - Placed at the top for instant visibility */}
          {(element.type === 'symbol' || element.type === 'custom_symbol') && (
            <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>اسم أو رقم الرمز (يظهر بجوار الرمز مباشرة):</span>
                </div>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  {element.label || element.text || 'رمز'}
                </span>
              </div>
              <input
                type="text"
                autoFocus
                value={element.label ?? element.text ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const updated = elements.map((item) =>
                    item.id === element.id
                      ? { ...item, label: val, text: val, symbolName: val }
                      : item
                  );
                  onElementsChange(updated);
                }}
                className="w-full bg-white border-2 border-amber-400 rounded-lg px-3 py-2 font-bold text-xs text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                placeholder="اكتب اسم أو رقم الرمز... (مثال: SP 104 أو محطة 973018 أو كابينة 3)"
              />

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-amber-900 font-bold">اقتراحات سريعة:</span>
                {(element.symbolKind === 'sp'
                  ? ['SP', 'SP 1', 'SP 2', 'SP 101', 'SP 102', 'نقطة تغذية']
                  : element.symbolKind === 'substation'
                  ? ['محطة 973018', 'محطة 973019', 'محطة تحويل', 'محطة فرعية']
                  : element.symbolKind === 'cabinet' || element.symbolKind === 'substation_cross'
                  ? ['كابينة C973018/5', 'كابينة C1', 'كابينة C2', 'كابينة توزيع']
                  : element.symbolKind === 'joint'
                  ? ['لحام 70', 'لحام 185', 'لحام 300', 'مفصل أرضي']
                  : ['SP 1', 'محطة 973018', 'كابينة C1', 'عمود 15', 'لحام 70']
                ).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      const updated = elements.map((item) =>
                        item.id === element.id
                          ? { ...item, label: sug, text: sug, symbolName: sug }
                          : item
                      );
                      onElementsChange(updated);
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-amber-500 hover:text-white text-amber-900 rounded border border-amber-300 transition-colors shadow-2xs"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Label Position selector */}
              <div className="pt-2 border-t border-amber-200">
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  موضع الاسم أو الرقم بجوار الرمز:
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { id: 'top', label: 'أعلى ⬆' },
                    { id: 'bottom', label: 'أسفل ⬇' },
                    { id: 'right', label: 'يمين ➔' },
                    { id: 'left', label: 'يسار ⬅' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => {
                        const updated = elements.map((item) =>
                          item.id === element.id
                            ? { ...item, labelPosition: pos.id as any }
                            : item
                        );
                        onElementsChange(updated);
                      }}
                      className={`py-1 rounded-md font-bold text-center border transition-all ${
                        (element.labelPosition || (element.symbolKind === 'sp' ? 'top' : 'bottom')) === pos.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs ring-1 ring-amber-600'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Line Length & Elongation Controls */}
          {(element.type === 'line' || element.type === 'dimension') &&
            element.x2 !== undefined &&
            element.y2 !== undefined && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                    <Ruler className="w-4 h-4 text-blue-600" />
                    <span>التحكم في طول الخط والمترات</span>
                  </div>
                  <span className="font-mono font-black text-blue-800 bg-white px-2.5 py-0.5 rounded-full border border-blue-300 text-xs shadow-xs">
                    {currentMeters} م
                  </span>
                </div>

                {/* Quick Increase Steppers */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    تعديل سريع لطول الخط:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onResizeLine(element.id, currentMeters + 0.5)}
                      className="px-1 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-blue-300 text-blue-700 rounded-lg font-bold text-xs transition-colors shadow-2xs"
                      title="زيادة نصف متر"
                    >
                      +0.5م
                    </button>
                    <button
                      type="button"
                      onClick={() => onResizeLine(element.id, currentMeters + 1.0)}
                      className="px-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
                      title="زيادة متر واحد"
                    >
                      +1.0م
                    </button>
                    <button
                      type="button"
                      onClick={() => onResizeLine(element.id, currentMeters + 2.0)}
                      className="px-1 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
                      title="زيادة مترين"
                    >
                      +2.0م
                    </button>
                    <button
                      type="button"
                      onClick={() => onResizeLine(element.id, currentMeters + 5.0)}
                      className="px-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs"
                      title="زيادة 5 أمتار"
                    >
                      +5.0م
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => onResizeLine(element.id, Math.max(0.5, currentMeters - 1.0))}
                      className="px-2 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs transition-colors"
                      title="إنقاص متر"
                    >
                      - 1.0م (إنقاص)
                    </button>
                    <button
                      type="button"
                      onClick={() => onResizeLine(element.id, Math.max(0.5, currentMeters - 5.0))}
                      className="px-2 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs transition-colors"
                      title="إنقاص 5 أمتار"
                    >
                      - 5.0م (إنقاص)
                    </button>
                  </div>
                </div>

                {/* Direct Custom Length Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    تحديد الطول الإجمالي يدوياً:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={currentMeters}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onResizeLine(element.id, val);
                        }
                      }}
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 font-mono font-bold text-xs text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <span className="font-bold text-blue-900 text-xs">متر</span>
                  </div>
                </div>

                {/* Extension Direction / Anchor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    جهة التمديد والزيادة:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setInspectorAnchor('start')}
                      className={`py-1.5 px-1 rounded-lg font-bold transition-all ${
                        inspectorAnchor === 'start'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title="تثبيت البداية وتمديد الطرف الآخر"
                    >
                      من النهاية ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorAnchor('end')}
                      className={`py-1.5 px-1 rounded-lg font-bold transition-all ${
                        inspectorAnchor === 'end'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title="تثبيت النهاية وتمديد البداية للخلف"
                    >
                      من البداية ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorAnchor('center')}
                      className={`py-1.5 px-1 rounded-lg font-bold transition-all ${
                        inspectorAnchor === 'center'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title="تمديد متساوي من الطرفين"
                    >
                      من الطرفين
                    </button>
                  </div>
                </div>

                {/* Connected symbols option */}
                <div className="space-y-1.5 pt-2 text-[11px] text-slate-600 border-t border-blue-200/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={moveConnectedSymbols}
                      onChange={(e) => setMoveConnectedSymbols(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 accent-blue-600"
                    />
                    <span>تحريك النقطة المتصلة بالخط تلقائياً (SP / المحطة)</span>
                  </label>
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    ملاحظة: أطوال الحفرية والأسفلت والترابية والبلاط في الجدول بالأعلى تحرر يدوياً ومستقلة تماماً عن طول الكابل.
                  </p>
                </div>
              </div>
            )}

          {/* Subscription Specific Configuration */}
          {element.symbolKind === 'subscription' && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs border-b border-emerald-200/80 pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>بيانات رمز الاشتراك / العداد (كما في صورة 5583)</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                    الرقم العلوي (رقم الاشتراك):
                  </label>
                  <input
                    type="text"
                    value={element.subscriptionTop ?? '2658'}
                    onChange={(e) => {
                      const updated = elements.map((item) =>
                        item.id === element.id
                          ? { ...item, subscriptionTop: e.target.value }
                          : item
                      );
                      onElementsChange(updated);
                    }}
                    placeholder="2658"
                    className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                    الرقم السفلي (رقم العداد/الفرع):
                  </label>
                  <input
                    type="text"
                    value={element.subscriptionBottom ?? '3853'}
                    onChange={(e) => {
                      const updated = elements.map((item) =>
                        item.id === element.id
                          ? { ...item, subscriptionBottom: e.target.value }
                          : item
                      );
                      onElementsChange(updated);
                    }}
                    placeholder="3853"
                    className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-[10px] text-emerald-700 leading-relaxed">
                رمز الاشتراك المعتمد يتكون من صندوق العداد المنقسم بجانبه رقم الاشتراك والعداد مقسومين بخط فاصل، ويمكنك أيضاً النقر المزدوج عليهما مباشرة على اللوحة لتعديلهما فوراً.
              </p>
            </div>
          )}

          {/* Cable Length Label Side Positioning (IMG_5583 requirement) */}
          {(element.type === 'line' || element.type === 'dimension') && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                جهة كتابة الطول بجوار الكابل:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const updated = elements.map((item) =>
                      item.id === element.id
                        ? { ...item, labelSide: 'left' as const }
                        : item
                    );
                    onElementsChange(updated);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    (element.labelSide ?? 'left') === 'left'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>يسار / أعلى الكيبل (افتراضي)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = elements.map((item) =>
                      item.id === element.id
                        ? { ...item, labelSide: 'right' as const }
                        : item
                    );
                    onElementsChange(updated);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    element.labelSide === 'right'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>يمين / أسفل الكيبل</span>
                </button>
              </div>
            </div>
          )}

          {/* Milling Trench Corridor Toggle (نمط الكشط كما في صورة 5584) */}
          {element.type === 'line' && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs"></span>
                  <span>مسار الكشط (كشط الأسفلت مع الكيبل - صورة 5584)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-900">
                  <input
                    type="checkbox"
                    checked={element.isMilling || element.soilType === 'KASHT'}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const updated = elements.map((item) =>
                        item.id === element.id
                          ? {
                              ...item,
                              isMilling: checked,
                              soilType: checked ? ('KASHT' as const) : ('AS' as const),
                              strokeColor: '#0022cc',
                              strokeWidth: checked ? 2.8 : 2.5,
                              label: checked
                                ? (item.label?.replace(/^(AS|NG|T)\s*/, 'كشط ') || `كشط ${currentMeters}M`)
                                : (item.label?.replace(/^كشط\s*/, 'AS ') || `AS ${currentMeters}M`),
                            }
                          : item
                      );
                      onElementsChange(updated);
                    }}
                    className="rounded border-slate-300 text-blue-600 accent-blue-600"
                  />
                  <span>تفعيل شكل الكشط</span>
                </label>
              </div>
              <p className="text-[10px] text-blue-700 leading-relaxed">
                يرسم الكيبل محاطاً بحدود كشط منقطة وشبكة رصف وزوايا مربعة مطابقة تماماً للمواصفة الهندسية في صورة 5584.
              </p>
            </div>
          )}

          {/* Line Style Toggle: Solid vs Dashed */}
          {(element.type === 'line' || element.type === 'dimension') && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                نمط رسم الخط (مستمر أو متقطع):
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const updated = elements.map((item) =>
                      item.id === element.id
                        ? { ...item, strokeStyle: 'solid' as const }
                        : item
                    );
                    onElementsChange(updated);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    element.strokeStyle !== 'dashed'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-4 h-0.5 bg-current rounded-full" />
                  <span>خط مستمر صلب</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = elements.map((item) =>
                      item.id === element.id
                        ? { ...item, strokeStyle: 'dashed' as const }
                        : item
                    );
                    onElementsChange(updated);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    element.strokeStyle === 'dashed'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-4 h-0.5 border-b-2 border-dashed border-current" />
                  <span>خط متقطع (منقوط)</span>
                </button>
              </div>
            </div>
          )}

          {/* Light Rectangle & Building Footprint Options */}
          {element.type === 'rect' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  نوع إطار المربع / المبنى:
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={element.isLight ?? false}
                    onChange={(e) => {
                      const isLight = e.target.checked;
                      const updated = elements.map((item) =>
                        item.id === element.id
                          ? {
                              ...item,
                              isLight,
                              strokeColor: isLight ? '#94a3b8' : item.strokeColor,
                              strokeWidth: isLight ? 1.2 : item.strokeWidth,
                            }
                          : item
                      );
                      onElementsChange(updated);
                    }}
                    className="rounded border-slate-300 text-orange-600 accent-orange-600"
                  />
                  <span>خط خفيف (مبنى / قطعة أرض)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const updated = elements.map((item) =>
                      item.id === element.id
                        ? { ...item, strokeStyle: 'solid' as const }
                        : item
                    );
                    onElementsChange(updated);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                    element.strokeStyle !== 'dashed'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  خط مستمر صلب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = elements.map((item) =>
                      item.id === element.id
                        ? { ...item, strokeStyle: 'dashed' as const }
                        : item
                    );
                    onElementsChange(updated);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                    element.strokeStyle === 'dashed'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  خط متقطع (منقوط)
                </button>
              </div>
            </div>
          )}

          {/* Label / Dimension Text for Lines */}
          {(element.type === 'line' || element.type === 'dimension') && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                نص القياس / التسمية التوضيحية للخط
              </label>
              <input
                type="text"
                value={element.label || ''}
                onChange={(e) => {
                  const updated = elements.map((item) =>
                    item.id === element.id ? { ...item, label: e.target.value } : item
                  );
                  onElementsChange(updated);
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="مثال: AS 6.00M أو NG15.0M"
              />
            </div>
          )}

          {/* Textbox / Text content */}
          {(element.type === 'textbox' || element.type === 'text') && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  <span>محتوى النص والملاحظات</span>
                </span>
                <span className="text-[10px] text-slate-400">يمكن كتابة أي نص تريده</span>
              </label>
              <textarea
                rows={3}
                value={element.text || ''}
                onChange={(e) => {
                  const updated = elements.map((item) =>
                    item.id === element.id ? { ...item, text: e.target.value } : item
                  );
                  onElementsChange(updated);
                }}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-['Cairo',sans-serif]"
                placeholder="اكتب الملاحظات أو التفاصيل المساحية هنا..."
              />

              {/* Text styling options */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={element.isBoxed ?? false}
                    onChange={(e) => {
                      const updated = elements.map((item) =>
                        item.id === element.id ? { ...item, isBoxed: e.target.checked } : item
                      );
                      onElementsChange(updated);
                    }}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>إظهار إطار وخلفية بيضاء للنص</span>
                </label>

                <div className="flex items-center gap-1 font-mono">
                  <span className="text-[10px] text-slate-500 font-bold">الحجم:</span>
                  <input
                    type="number"
                    min="9"
                    max="36"
                    value={element.fontSize || 13}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 13;
                      const updated = elements.map((item) =>
                        item.id === element.id ? { ...item, fontSize: val } : item
                      );
                      onElementsChange(updated);
                    }}
                    className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500">px</span>
                </div>
              </div>
            </div>
          )}

          {/* Soil Type Selector */}
          {element.soilType && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                نوع التربة والمسار
              </label>
              <select
                value={element.soilType}
                onChange={(e) => {
                  const soil = e.target.value as SoilType;
                  const updated = elements.map((item) =>
                    item.id === element.id
                      ? {
                          ...item,
                          soilType: soil,
                          isMilling: soil === 'KASHT' ? true : item.isMilling,
                          strokeColor:
                            soil === 'T' ? '#059669' : '#0022cc',
                          label: soil === 'KASHT'
                            ? (item.label?.replace(/^(AS|NG|T)\s*/, 'كشط ') || item.label)
                            : item.label,
                        }
                      : item
                  );
                  onElementsChange(updated);
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="KASHT">كشط (الكشط مع الكيبل - صورة 5584)</option>
                <option value="AS">أسفلت (AS)</option>
                <option value="NG">ترابي (NG)</option>
                <option value="T">بلاط (T)</option>
                <option value="NONE">بدون تصنيف</option>
              </select>
            </div>
          )}

          {/* Stroke Width & Color */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                سماكة الخط ({element.strokeWidth}px)
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={element.strokeWidth}
                onChange={(e) => {
                  const w = parseFloat(e.target.value);
                  const updated = elements.map((item) =>
                    item.id === element.id ? { ...item, strokeWidth: w } : item
                  );
                  onElementsChange(updated);
                }}
                className="w-full accent-blue-600 mt-2"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-slate-500" />
                <span>اللون</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={element.strokeColor || '#000000'}
                  onChange={(e) => {
                    const c = e.target.value;
                    const updated = elements.map((item) =>
                      item.id === element.id ? { ...item, strokeColor: c } : item
                    );
                    onElementsChange(updated);
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
                <span className="font-mono text-slate-600 text-xs">
                  {element.strokeColor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              onDeleteElement(element.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف العنصر</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>حفظ وإغلاق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
