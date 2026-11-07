import React, { useState } from 'react';
import { WorkOrderData, CanvasElement } from '../types';
import {
  X,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Save,
  RotateCcw,
  Building,
  Upload,
} from 'lucide-react';
import {
  TEMPLATE_1_IMG_5555,
  TEMPLATE_2_IMG_5554,
} from '../constants/defaultWorkOrders';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrderData;
  onSave: (updated: WorkOrderData) => void;
  onLoadTemplate: (
    template: { workOrder: WorkOrderData; elements: CanvasElement[] }
  ) => void;
  elements: CanvasElement[];
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onSave,
  onLoadTemplate,
  elements,
}) => {
  const [formData, setFormData] = useState<WorkOrderData>({ ...workOrder });
  const [activeTab, setActiveTab] = useState<'info' | 'lengths' | 'materials' | 'approvals' | 'company'>('info');

  if (!isOpen) return null;

  const handleChange = (field: keyof WorkOrderData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (
    category: 'welds' | 'cables' | 'lugs' | 'terminations',
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleApprovalChange = (
    role: keyof WorkOrderData['approvals'],
    field: 'name' | 'date',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      approvals: {
        ...prev.approvals,
        [role]: {
          ...prev.approvals[role],
          [field]: value,
        },
      },
    }));
  };

  // Quick adjust length with delta (+1M, +5M, -1M)
  const quickAdjustLength = (
    field: 'asphaltLength' | 'soilLength' | 'tileLength' | 'trenchLength',
    delta: number
  ) => {
    const currentStr = formData[field] || '0';
    const match = currentStr.match(/(\d+(\.\d+)?)/);
    const currentVal = match ? parseFloat(match[1]) : 0;
    const newVal = Math.max(0, Math.round((currentVal + delta) * 100) / 100);
    const formatted = `${newVal.toFixed(2)} M`;

    setFormData((prev) => {
      const updated = { ...prev, [field]: formatted };
      if (field !== 'trenchLength') {
        const getNum = (str: string) => {
          const m = str.match(/(\d+(\.\d+)?)/);
          return m ? parseFloat(m[1]) : 0;
        };
        const asVal = field === 'asphaltLength' ? newVal : getNum(prev.asphaltLength);
        const ngVal = field === 'soilLength' ? newVal : getNum(prev.soilLength);
        const tVal = field === 'tileLength' ? newVal : getNum(prev.tileLength);
        const total = asVal + ngVal + tVal;
        updated.trenchLength = `${total.toFixed(2)} M`;
        updated.trenchLengthDisplay = `${Math.round(total)}M`;
        updated.cables = {
          ...prev.cables,
          c70: `${Math.round(total)}`,
        };
      }
      return updated;
    });
  };

  // Auto-calculate lengths from drawn lines
  const handleAutoCalculateFromCanvas = () => {
    let totalAsphalt = 0;
    let totalSoil = 0;
    let totalTile = 0;

    elements.forEach((el) => {
      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        // Parse from label if available (e.g. "AS 6.00M" or "NG15.0M")
        const label = el.label || '';
        const match = label.match(/(\d+(\.\d+)?)/);
        const meters = match
          ? parseFloat(match[1])
          : Math.hypot(el.x2 - el.x, el.y2 - el.y) / 25;

        if (el.soilType === 'AS' || label.toUpperCase().includes('AS')) {
          totalAsphalt += meters;
        } else if (el.soilType === 'NG' || label.toUpperCase().includes('NG')) {
          totalSoil += meters;
        } else if (el.soilType === 'T' || label.toUpperCase().includes('T')) {
          totalTile += meters;
        }
      }
    });

    const totalTrench = totalAsphalt + totalSoil + totalTile;

    setFormData((prev) => ({
      ...prev,
      trenchLengthDisplay: `${Math.round(totalTrench)}M`,
      trenchLength: `${totalTrench.toFixed(2)} M`,
      asphaltLength: `${totalAsphalt.toFixed(2)} M`,
      soilLength: `${totalSoil.toFixed(2)}M`,
      tileLength: `${totalTile.toFixed(2)}M`,
      cables: {
        ...prev.cables,
        c70: `${Math.round(totalTrench)}`,
      },
    }));
  };

  const handleSaveAndClose = () => {
    onSave(formData);
    onClose();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          companyLogoUrl: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">بيانات أمر العمل والنموذج</h2>
              <p className="text-xs text-slate-400">
                أدخل كافة تفاصيل البلاغ والكميات لتحديث النموذج المساحي مباشرة
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

        {/* Quick Presets matching user photos */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Layers className="w-4 h-4 text-orange-600" />
              نماذج سريعة جاهزة:
            </span>
            <button
              type="button"
              onClick={() => onLoadTemplate(TEMPLATE_1_IMG_5555)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:border-orange-500 hover:text-orange-600 font-semibold shadow-xs transition-colors"
            >
              نموذج 1: بلاغ 39572523 (أسفلت 10م)
            </button>
            <button
              type="button"
              onClick={() => onLoadTemplate(TEMPLATE_2_IMG_5554)}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:border-orange-500 hover:text-orange-600 font-semibold shadow-xs transition-colors"
            >
              نموذج 2: بلاغ 39421150 (ترابية 15م مع محطة)
            </button>
          </div>

          {/* Smart auto-calculation button */}
          <button
            type="button"
            onClick={handleAutoCalculateFromCanvas}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs"
            title="تحديث قيم الحفرية والأسفلت والترابي تلقائياً بجمع أطوال الخطوط المرسومة"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>حساب الأطوال تلقائياً من الرسم</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white gap-2">
          {[
            { id: 'info', label: 'معلومات البلاغ والموقع' },
            { id: 'lengths', label: 'أطوال الحفرية والتربة' },
            { id: 'materials', label: 'الكيابل والمفاصل واللقزات' },
            { id: 'approvals', label: 'الاعتمادات والتواقيع' },
            { id: 'company', label: 'شعار واسم الشركة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: General Info */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم البلاغ *
                </label>
                <input
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => handleChange('orderNumber', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="39572523"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم المحطة
                </label>
                <input
                  type="text"
                  value={formData.stationNumber}
                  onChange={(e) => handleChange('stationNumber', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="0000 أو 973018"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المنطقة / الحي
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="الحرازات"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ التسليم
                </label>
                <input
                  type="text"
                  value={formData.deliveryDate}
                  onChange={(e) => handleChange('deliveryDate', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="30/5/2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كيبل مؤقت
                </label>
                <input
                  type="text"
                  value={formData.tempCable}
                  onChange={(e) => handleChange('tempCable', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إحداثيات شرقيات (Easting)
                </label>
                <input
                  type="text"
                  value={formData.easting}
                  onChange={(e) => handleChange('easting', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="0000000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إحداثيات شماليات (Northing)
                </label>
                <input
                  type="text"
                  value={formData.northing}
                  onChange={(e) => handleChange('northing', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="0000000"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Lengths & Soils */}
          {activeTab === 'lengths' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center justify-between">
                <span>
                  يمكنك إدخال الأطوال يدوياً أو النقر على زر <b>الحساب التلقائي</b> لجمع الأطوال من الرسم الهندسي مباشرة.
                </span>
                <button
                  type="button"
                  onClick={handleAutoCalculateFromCanvas}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 text-xs shadow-xs"
                >
                  حساب تلقائي
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طول الحفرية الإجمالي (المختصر بأعلى الجدول)
                  </label>
                  <input
                    type="text"
                    value={formData.trenchLengthDisplay}
                    onChange={(e) => handleChange('trenchLengthDisplay', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="10M أو 15 M"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طول الحفرية التفصيلي
                  </label>
                  <input
                    type="text"
                    value={formData.trenchLength}
                    onChange={(e) => handleChange('trenchLength', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="10.00 M أو 00 M"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      طول الأسفلت {'{AS}'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('asphaltLength', 1)}
                        className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-[10px] font-bold"
                        title="زيادة متر"
                      >
                        +1م
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('asphaltLength', 5)}
                        className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                        title="زيادة 5 أمتار"
                      >
                        +5م
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('asphaltLength', -1)}
                        className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold"
                        title="إنقاص متر"
                      >
                        -1م
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData.asphaltLength}
                    onChange={(e) => handleChange('asphaltLength', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none text-blue-700"
                    placeholder="10.00 M"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      طول التربة الترابية {'{NG}'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('soilLength', 1)}
                        className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[10px] font-bold"
                        title="زيادة متر"
                      >
                        +1م
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('soilLength', 5)}
                        className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                        title="زيادة 5 أمتار"
                      >
                        +5م
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('soilLength', -1)}
                        className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold"
                        title="إنقاص متر"
                      >
                        -1م
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData.soilLength}
                    onChange={(e) => handleChange('soilLength', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none text-amber-700"
                    placeholder="15.00M أو 0.00M"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      طول البلاط {'{T}'}
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('tileLength', 1)}
                        className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold"
                        title="زيادة متر"
                      >
                        +1م
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('tileLength', 5)}
                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                        title="زيادة 5 أمتار"
                      >
                        +5م
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAdjustLength('tileLength', -1)}
                        className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold"
                        title="إنقاص متر"
                      >
                        -1م
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData.tileLength}
                    onChange={(e) => handleChange('tileLength', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none text-emerald-700"
                    placeholder="0.00M"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Materials & Breakdown */}
          {activeTab === 'materials' && (
            <div className="space-y-5">
              {/* Welds (لحام) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>اللحامات (لحام)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    الأحجام: 500, 300, 70
                  </span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لحام 500</label>
                    <input
                      type="text"
                      value={formData.welds.w500}
                      onChange={(e) => handleNestedChange('welds', 'w500', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لحام 300</label>
                    <input
                      type="text"
                      value={formData.welds.w300}
                      onChange={(e) => handleNestedChange('welds', 'w300', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لحام 70</label>
                    <input
                      type="text"
                      value={formData.welds.w70}
                      onChange={(e) => handleNestedChange('welds', 'w70', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-center font-mono font-bold text-sm bg-orange-50 text-orange-700"
                    />
                  </div>
                </div>
              </div>

              {/* Cables (كيبل) & Station */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>الكيابل ومحطة التحويل</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    الأحجام: 500, 300, 185, 70
                  </span>
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">كيبل 500</label>
                    <input
                      type="text"
                      value={formData.cables.c500}
                      onChange={(e) => handleNestedChange('cables', 'c500', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">كيبل 300</label>
                    <input
                      type="text"
                      value={formData.cables.c300}
                      onChange={(e) => handleNestedChange('cables', 'c300', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">كيبل 185</label>
                    <input
                      type="text"
                      value={formData.cables.c185}
                      onChange={(e) => handleNestedChange('cables', 'c185', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">كيبل 70</label>
                    <input
                      type="text"
                      value={formData.cables.c70}
                      onChange={(e) => handleNestedChange('cables', 'c70', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm bg-orange-50 text-orange-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">محطة</label>
                    <input
                      type="text"
                      value={formData.stationCount}
                      onChange={(e) => handleChange('stationCount', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Lugs (لقز) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 mb-3">اللقزات (لقز)</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لقز 500</label>
                    <input
                      type="text"
                      value={formData.lugs.l500}
                      onChange={(e) => handleNestedChange('lugs', 'l500', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لقز 300</label>
                    <input
                      type="text"
                      value={formData.lugs.l300}
                      onChange={(e) => handleNestedChange('lugs', 'l300', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لقز 185</label>
                    <input
                      type="text"
                      value={formData.lugs.l185}
                      onChange={(e) => handleNestedChange('lugs', 'l185', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">لقز 70</label>
                    <input
                      type="text"
                      value={formData.lugs.l70}
                      onChange={(e) => handleNestedChange('lugs', 'l70', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Terminations (نهاية) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 mb-3">النهايات (نهاية)</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">نهاية 500</label>
                    <input
                      type="text"
                      value={formData.terminations.t500}
                      onChange={(e) => handleNestedChange('terminations', 't500', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">نهاية 300</label>
                    <input
                      type="text"
                      value={formData.terminations.t300}
                      onChange={(e) => handleNestedChange('terminations', 't300', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">نهاية 185</label>
                    <input
                      type="text"
                      value={formData.terminations.t185}
                      onChange={(e) => handleNestedChange('terminations', 't185', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">نهاية 70</label>
                    <input
                      type="text"
                      value={formData.terminations.t70}
                      onChange={(e) => handleNestedChange('terminations', 't70', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Approvals */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                أدخل أسماء المشرفين والمهندسين وتواريخ الاعتماد للظهور في جدول التواقيع أسفل النموذج
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'contractorRep' as const, label: 'مندوب المقاول' },
                  { key: 'secEmployee' as const, label: 'موظف الكهرباء' },
                  { key: 'boqReceiver' as const, label: 'مستلم المقايسة' },
                  { key: 'dataEntry' as const, label: 'مدخل لبيانات' },
                  { key: 'itemsReviewer' as const, label: 'مراجعة البنود' },
                  { key: 'approval' as const, label: 'الاعتماد' },
                ].map((item) => (
                  <div key={item.key} className="border border-slate-200 rounded-xl p-3 bg-white">
                    <span className="block text-xs font-bold text-slate-800 mb-2">
                      {item.label}
                    </span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="الاسم"
                        value={formData.approvals[item.key]?.name || ''}
                        onChange={(e) => handleApprovalChange(item.key, 'name', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="التاريخ (يوم/شهر/سنة)"
                        value={formData.approvals[item.key]?.date || ''}
                        onChange={(e) => handleApprovalChange(item.key, 'date', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Company & Logo */}
          {activeTab === 'company' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الشركة (بالعربية)
                </label>
                <input
                  type="text"
                  value={formData.companyNameAr || ''}
                  onChange={(e) => handleChange('companyNameAr', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold"
                  placeholder="شركة الجوان المتطورة للمقاولات"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الشركة (بالإنجليزية)
                </label>
                <input
                  type="text"
                  value={formData.companyNameEn || ''}
                  onChange={(e) => handleChange('companyNameEn', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="ADVANCED CO. LTD FOR CONTRACTING"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رمز الشركة / الاختصار
                </label>
                <input
                  type="text"
                  value={formData.companyCode || ''}
                  onChange={(e) => handleChange('companyCode', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-black font-mono tracking-wider"
                  placeholder="ALJUAN"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شعار مخصص (اختياري)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 hover:border-orange-500 cursor-pointer text-xs font-medium text-slate-700 bg-slate-50">
                    <Upload className="w-4 h-4 text-orange-600" />
                    <span>رفع صورة الشعار</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.companyLogoUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('companyLogoUrl', undefined)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      إعادة للشعار الافتراضي ALJUAN
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتحديث النموذج</span>
          </button>
        </div>
      </div>
    </div>
  );
};
