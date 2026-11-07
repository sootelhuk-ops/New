import React, { useState, useEffect, useRef } from 'react';
import {
  MousePointer,
  Minus,
  Square,
  Circle as CircleIcon,
  Ruler,
  Type,
  Stamp,
  PenTool,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Printer,
  Compass,
  Zap,
  ChevronDown,
  Layers,
  Sparkles,
  Eye,
  Check,
  X,
  Cable,
  Shapes,
  FolderOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { CadTool, CustomTool, CanvasElement } from '../types';

interface CadToolbarProps {
  activeTool: CadTool;
  setActiveTool: (tool: CadTool) => void;
  orthoMode: boolean;
  setOrthoMode: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  snapToGrid: boolean;
  setSnapToGrid: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  showGrid: boolean;
  setShowGrid: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  selectedElementId: string | null;
  selectedElement?: CanvasElement | null;
  onQuickLengthen?: (delta: number) => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  customTools: CustomTool[];
  onOpenCustomToolModal: () => void;
  onOpenSignatureModal: () => void;
  onOpenImageUpload: () => void;
  onOpenWorkOrderModal: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onPrint: () => void;
  onLoadTemplate1?: () => void;
  onLoadTemplate2?: () => void;
  onLoadTemplate3?: () => void;
  onLoadTemplate4?: () => void;
  onAutoCalculateLengths?: () => void;
  onOpenReferenceModal?: () => void;
  onOpenDriveModal?: () => void;
  presetCableLength?: number | null;
  setPresetCableLength?: (len: number | null | ((prev: number | null) => number | null)) => void;
  onInsertPredefinedCable?: (meters: number, type: 'KASHT' | 'AS' | 'NG' | 'T' | 'DASHED', direction: 'vertical' | 'horizontal') => void;
  isAddPageTextActive?: boolean;
  onTogglePageText?: () => void;
  onInsertPresetText?: (preset: string) => void;
  onEditSymbolName?: (element: CanvasElement) => void;
}

export const CadToolbar: React.FC<CadToolbarProps> = ({
  activeTool,
  setActiveTool,
  orthoMode,
  setOrthoMode,
  snapToGrid,
  setSnapToGrid,
  showGrid,
  setShowGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  selectedElementId,
  selectedElement,
  onQuickLengthen,
  zoom,
  setZoom,
  customTools,
  onOpenCustomToolModal,
  onOpenSignatureModal,
  onOpenImageUpload,
  onOpenWorkOrderModal,
  onExportPdf,
  onExportPng,
  onPrint,
  onLoadTemplate1,
  onLoadTemplate2,
  onLoadTemplate3,
  onLoadTemplate4,
  onAutoCalculateLengths,
  onOpenReferenceModal,
  onOpenDriveModal,
  presetCableLength = null,
  setPresetCableLength,
  onInsertPredefinedCable,
  isAddPageTextActive = false,
  onTogglePageText,
  onInsertPresetText,
  onEditSymbolName,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [insertLengthMeters, setInsertLengthMeters] = useState<number>(6);
  const [insertType, setInsertType] = useState<'KASHT' | 'AS' | 'NG' | 'T' | 'DASHED'>('KASHT');
  const [insertDirection, setInsertDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close open dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleMenu = (menuKey: string) => {
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  const handleSelectTool = (tool: CadTool) => {
    setActiveTool(tool);
    setOpenMenu(null);
  };

  const getToolDisplayName = (tool: CadTool) => {
    switch (tool) {
      case 'select':
        return 'اختيار وتحريك';
      case 'cable_kasht':
        return 'الكشط (كشط الأسفلت مع الكيبل)';
      case 'cable_as':
        return 'كيبل أسفلت {AS}';
      case 'cable_ng':
        return 'كيبل ترابي {NG}';
      case 'cable_t':
        return 'كيبل بلاط {T}';
      case 'cable_dashed':
        return 'خط متقطع (كيبل منقوط مع الطول)';
      case 'subscription':
        return 'اشتراك وعداد (2658/3853)';
      case 'line':
        return 'خط مستقيم / شارع';
      case 'rect':
        return 'مستطيل / غرفة';
      case 'circle':
        return 'دائرة / منهل';
      case 'dimension':
        return 'قياس مسافة وبُعد';
      case 'text':
        return 'نص حر';
      case 'textbox':
        return 'مربع نصي';
      case 'sp':
        return 'نقطة خدمة SP';
      case 'substation':
        return 'محطة تحويل (بخطين عكسيين ⤫)';
      case 'cabinet':
      case 'substation_cross':
        return 'كابينة توزيع C (مثلثية)';
      case 'joint':
        return 'لحام / مفصل';
      case 'north':
        return 'سهم الشمال N';
      default: {
        const ct = customTools.find((t) => t.id === tool);
        return ct ? ct.name : 'أداة مخصصة';
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-[100] w-full flex-shrink-0 flex flex-col font-['Cairo',sans-serif] select-none shadow-md"
    >
      {/* 1. صف القوائم المنسدلة العلوية (Top Dropdown Menu Bar) - Excel / AutoCAD style */}
      <div className="w-full bg-slate-900 text-slate-200 border-b border-slate-800 px-3 py-1 flex items-center justify-between text-xs overflow-visible relative">
        {/* Right side: Brand & Dropdown Menus */}
        <div className="flex items-center gap-1 overflow-visible relative">
          {/* Logo badge */}
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-700/80">
            <div className="w-6 h-6 rounded bg-[#107c41] flex items-center justify-center font-black text-white text-xs shadow-xs font-mono">
              X
            </div>
            <span className="font-bold text-white tracking-wide text-xs">كروكي CAD</span>
          </div>

          {/* القائمة 1: ملف وأمر العمل */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('file_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                openMenu === 'file_menu'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
              <span>ملف وبيانات البلاغ</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'file_menu' && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40">
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenWorkOrderModal();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-white font-bold"
                >
                  <FileSpreadsheet className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <div className="text-xs">تعديل بيانات أمر العمل</div>
                    <div className="text-[10px] text-slate-400 font-normal">رقم البلاغ، المحطة، الحي، الكيابل والبنود</div>
                  </div>
                </button>

                {onAutoCalculateLengths && (
                  <button
                    onClick={() => {
                    setOpenMenu(null);
                    onAutoCalculateLengths();
                  }}
                    className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-emerald-300 font-bold border-t border-slate-700/60"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs">حساب الأطوال تلقائياً من الرسم</div>
                      <div className="text-[10px] text-slate-400 font-normal">جمع مسارات AS و NG و T وتحديث جدول المقايسة</div>
                    </div>
                  </button>
                )}

                <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 bg-slate-900/70 mt-1 border-t border-slate-700/60">
                  نماذج البلاغات الجاهزة (كروكي مطابق):
                </div>

                {onLoadTemplate1 && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onLoadTemplate1();
                    }}
                    className="w-full text-right px-3.5 py-2 flex items-center gap-2 hover:bg-slate-700/80 text-slate-200"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs font-medium">نموذج 1: بلاغ 39572523</div>
                      <div className="text-[10px] text-slate-400">حفر أسفلت 10م (AS) - الحرازات</div>
                    </div>
                  </button>
                )}

                {onLoadTemplate2 && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onLoadTemplate2();
                    }}
                    className="w-full text-right px-3.5 py-2 flex items-center gap-2 hover:bg-slate-700/80 text-slate-200"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <div className="text-xs font-medium">نموذج 2: بلاغ 39421150</div>
                      <div className="text-[10px] text-slate-400">ترابية 15م (NG) مع محطة وكابينة</div>
                    </div>
                  </button>
                )}

                {onLoadTemplate3 && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onLoadTemplate3();
                    }}
                    className="w-full text-right px-3.5 py-2 flex items-center gap-2 hover:bg-slate-700/80 text-slate-200"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-medium">نموذج 3: كروكي اشتراك وعداد (IMG_5583)</div>
                      <div className="text-[10px] text-slate-400">كيبل أسفلت AS6.0M مع رمز اشتراك وكسر 2658 / 3853</div>
                    </div>
                  </button>
                )}

                {onLoadTemplate4 && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onLoadTemplate4();
                    }}
                    className="w-full text-right px-3.5 py-2 flex items-center gap-2 hover:bg-slate-700/80 text-slate-200"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-medium">نموذج 4: مسار وشكل الكشط (IMG_5584)</div>
                      <div className="text-[10px] text-slate-400">مسار كشط أسفلت مع كيبل أزرق وحدود منقطة وشبكة كشط</div>
                    </div>
                  </button>
                )}

                {onOpenReferenceModal && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onOpenReferenceModal();
                    }}
                    className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700 text-cyan-300 font-medium border-t border-slate-700/60 mt-1"
                  >
                    <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>عرض الصور الأصلية للمقارنة</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* القائمة 2: أدوات الرسم والأشكال */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('draw_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                openMenu === 'draw_menu' || ['select', 'line', 'rect', 'circle', 'dimension', 'text'].includes(activeTool)
                  ? 'bg-slate-800 text-white font-bold'
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Shapes className="w-3.5 h-3.5 text-blue-400" />
              <span>أدوات الرسم</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'draw_menu' && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40">
                <button
                  onClick={() => handleSelectTool('select')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'select' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MousePointer className="w-4 h-4 text-blue-400" />
                    <span>اختيار وتحريك مباشر (V)</span>
                  </div>
                  {activeTool === 'select' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('line')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'line' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Minus className="w-4 h-4 text-slate-300" />
                    <span>خط مستقيم / شارع (L)</span>
                  </div>
                  {activeTool === 'line' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('dimension')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'dimension' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ruler className="w-4 h-4 text-rose-400" />
                    <span>قياس مسافة وأبعاد (D)</span>
                  </div>
                  {activeTool === 'dimension' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('text')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'text' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Type className="w-4 h-4 text-indigo-400" />
                    <span>كتابة نص حر (T)</span>
                  </div>
                  {activeTool === 'text' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('textbox')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'textbox' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-3.5 border border-dashed border-indigo-400 bg-slate-900 flex items-center justify-center text-[9px] font-bold text-indigo-300 rounded">
                      T
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-300">مربع نصي (Text Box)</div>
                      <div className="text-[10px] text-slate-400 font-normal">مربع محدد لكتابة الملاحظات والأبعاد</div>
                    </div>
                  </div>
                  {activeTool === 'textbox' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('rect')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 border-t border-slate-700/60`}
                >
                  <div className="flex items-center gap-2.5">
                    <Square className="w-4 h-4 text-amber-400" />
                    <span>مستطيل / غرفة / عقار (R)</span>
                  </div>
                  {activeTool === 'rect' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('light_rect')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 border-t border-slate-700/60`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border border-dashed border-slate-400 rounded-xs bg-slate-700/40" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">مربع / مبنى بخط خفيف</div>
                      <div className="text-[10px] text-slate-400">رسم حدود المبنى أو قطعة الأرض بخط رمادي خفيف</div>
                    </div>
                  </div>
                  {activeTool === 'light_rect' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                <button
                  onClick={() => handleSelectTool('circle')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80`}
                >
                  <div className="flex items-center gap-2.5">
                    <CircleIcon className="w-4 h-4 text-teal-400" />
                    <span>دائرة / منهل دائري (C)</span>
                  </div>
                  {activeTool === 'circle' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              </div>
            )}
          </div>

          {/* القائمة 3: مسارات الكيابل والحفر والكشط */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('cables_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                openMenu === 'cables_menu' || ['cable_as', 'cable_ng', 'cable_t', 'cable_kasht', 'cable_dashed'].includes(activeTool)
                  ? 'bg-blue-900/60 text-blue-300 font-bold'
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Cable className="w-3.5 h-3.5 text-blue-400" />
              <span>رسم أطوال الكيابل والكشط</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'cables_menu' && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40 text-xs">
                {/* 1. أداة الكشط المعتمدة (صورة 5584) */}
                <button
                  onClick={() => handleSelectTool('cable_kasht')}
                  className={`w-full text-right px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-700/80 border-b border-slate-700/60 ${
                    activeTool === 'cable_kasht' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Visual icon for Al-Kashat corridor */}
                    <div className="w-7 h-5 border border-dashed border-slate-400 bg-slate-900 rounded flex items-center justify-center relative overflow-hidden shrink-0">
                      <div className="absolute inset-y-0 w-1 bg-blue-500"></div>
                      <div className="w-full flex justify-between px-0.5 text-[7px] text-slate-400 font-mono">
                        <span>|_</span>
                        <span>|_</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <span>الكشط (كشط الأسفلت مع الكيبل)</span>
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">جديد 5584</span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">مسار حفرية وكشط مع كيبل أزرق وحدود منقطة وشبكة كشط</div>
                    </div>
                  </div>
                  {activeTool === 'cable_kasht' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>

                {/* 2. كيبل أسفلت AS */}
                <button
                  onClick={() => handleSelectTool('cable_as')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'cable_as' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-blue-500 rounded-full shrink-0" />
                    <div>
                      <div className="text-xs font-bold">كيبل أسفلت {'{AS}'}</div>
                      <div className="text-[10px] text-slate-400">خط أزرق بسماكة 2.5px للمسار المسفلت</div>
                    </div>
                  </div>
                  {activeTool === 'cable_as' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                {/* 3. كيبل ترابي NG */}
                <button
                  onClick={() => handleSelectTool('cable_ng')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'cable_ng' ? 'bg-amber-600/30 text-amber-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-amber-500 rounded-full shrink-0" />
                    <div>
                      <div className="text-xs font-bold">كيبل ترابي {'{NG}'}</div>
                      <div className="text-[10px] text-slate-400">خط أزرق ببادئة ترابية وتجميع تلقائي</div>
                    </div>
                  </div>
                  {activeTool === 'cable_ng' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                {/* 4. كيبل بلاط T */}
                <button
                  onClick={() => handleSelectTool('cable_t')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-1 bg-emerald-500 rounded-full shrink-0" />
                    <div>
                      <div className="text-xs font-bold">كيبل بلاط {'{T}'}</div>
                      <div className="text-[10px] text-slate-400">خط أخضر لمسارات الأرصفة والبلاط</div>
                    </div>
                  </div>
                  {activeTool === 'cable_t' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                {/* 5. خط متقطع (منقوط مع الطول) */}
                <button
                  onClick={() => handleSelectTool('cable_dashed')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'cable_dashed' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-0.5 border-b-2 border-dashed border-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <span>خط متقطع (كيبل منقوط مع الطول)</span>
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.2 rounded font-mono">Dashed</span>
                      </div>
                      <div className="text-[10px] text-slate-400">مسار متقطع مع قياس الطول بالمتر والتحكم فيه</div>
                    </div>
                  </div>
                  {activeTool === 'cable_dashed' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                {/* قائمة رسم طول الكيبل المباشر وتثبيت الطول */}
                <div className="mt-2 pt-2 border-t border-slate-700/80 px-3.5 space-y-2.5 bg-slate-900/40 pb-1 rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-blue-400" />
                      <span>قائمة رسم طول الكيبل:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {presetCableLength ? `مقيد بـ ${presetCableLength}م` : 'طول حر'}
                    </span>
                  </div>

                  {/* تقييد الطول أثناء الرسم بالماوس */}
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1">تثبيت الطول أثناء السحب بالماوس:</div>
                    <div className="grid grid-cols-5 gap-1 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPresetCableLength?.(null)}
                        className={`py-1 rounded font-bold border transition-colors ${
                          presetCableLength === null
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        حر
                      </button>
                      {[6, 10, 15, 20].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPresetCableLength?.(m)}
                          className={`py-1 rounded font-bold border transition-colors ${
                            presetCableLength === m
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          {m}م
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* إدراج كيبل بطول محدد فوراً على الكروكي */}
                  {onInsertPredefinedCable && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-700/40">
                      <div className="text-[10px] text-slate-400">إدراج فوري على اللوحة:</div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={insertType}
                          onChange={(e) => setInsertType(e.target.value as any)}
                          className="bg-slate-700 text-slate-200 rounded px-1.5 py-1 text-[11px] font-bold border border-slate-600 focus:outline-hidden"
                        >
                          <option value="KASHT">كشط (5584)</option>
                          <option value="AS">أسفلت AS</option>
                          <option value="NG">ترابي NG</option>
                          <option value="T">بلاط T</option>
                          <option value="DASHED">خط متقطع (منقوط)</option>
                        </select>
                        <select
                          value={insertDirection}
                          onChange={(e) => setInsertDirection(e.target.value as any)}
                          className="bg-slate-700 text-slate-200 rounded px-1.5 py-1 text-[11px] font-bold border border-slate-600 focus:outline-hidden"
                        >
                          <option value="vertical">عمودي ⬇</option>
                          <option value="horizontal">أفقي ➔</option>
                        </select>
                        <div className="flex items-center gap-1 bg-slate-700 rounded px-1.5 py-0.5 border border-slate-600 flex-1">
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={insertLengthMeters}
                            onChange={(e) => setInsertLengthMeters(parseFloat(e.target.value) || 6)}
                            className="w-12 bg-transparent text-white font-mono font-bold text-xs text-center focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-300">متر</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onInsertPredefinedCable(insertLengthMeters, insertType, insertDirection);
                          setOpenMenu(null);
                        }}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <span>➕ إدراج الكيبل على الكروكي بالطول المحدد</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Cable Length Lock Pill in Toolbar */}
          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px]">
            <Ruler className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-400 font-bold hidden md:inline">طول الكيبل:</span>
            <div className="flex items-center gap-1">
              {[null, 6, 10, 15, 20].map((len) => (
                <button
                  key={len === null ? 'free' : len}
                  type="button"
                  onClick={() => setPresetCableLength?.(len)}
                  className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] transition-all ${
                    presetCableLength === len
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={len === null ? 'رسم حر بدون تقييد الطول' : `تقييد طول الكيبل بـ ${len} متر أثناء الرسم`}
                >
                  {len === null ? 'حر' : `${len}م`}
                </button>
              ))}
            </div>
          </div>

          {/* القائمة 4: المحطات ورموز الكهرباء والمساحة */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('symbols_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                openMenu === 'symbols_menu' ||
                ['sp', 'substation', 'substation_cross', 'joint', 'subscription', 'north'].includes(activeTool) ||
                customTools.some((t) => t.id === activeTool)
                  ? 'bg-amber-900/60 text-amber-300 font-bold'
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>المحطات والرموز</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'symbols_menu' && (
              <div className="absolute top-full right-0 mt-1 w-68 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40">
                {/* 1. المحطة: صندوق بخطين عكسيين متقاطعين ⤫ */}
                <button
                  onClick={() => handleSelectTool('substation')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'substation' ? 'bg-amber-600/30 text-amber-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-4 border border-black relative bg-yellow-200 shrink-0 shadow-xs flex items-center justify-center">
                      <svg viewBox="0 0 20 14" className="w-full h-full">
                        <rect width="20" height="14" fill="#fef08a" stroke="#000" strokeWidth="1.2" />
                        <line x1="0" y1="0" x2="20" y2="14" stroke="#000" strokeWidth="1.2" />
                        <line x1="20" y1="0" x2="0" y2="14" stroke="#000" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-amber-300">محطة تحويل (بخطين عكسيين ⤫)</div>
                      <div className="text-[10px] text-slate-400">رمز المحطة المعتمد مع خطين متقاطعين بالداخل</div>
                    </div>
                  </div>
                  {activeTool === 'substation' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                {/* 2. الكبينة: كابينة توزيع C بنصفين مثلثين أصفر وأزرق */}
                <button
                  onClick={() => handleSelectTool('cabinet')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'cabinet' || activeTool === 'substation_cross' ? 'bg-indigo-600/30 text-indigo-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-3.5 border border-black relative overflow-hidden bg-yellow-400 shrink-0 shadow-xs">
                      <div
                        className="absolute inset-0 bg-blue-700"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                      />
                    </div>
                    <div>
                      <div className="font-bold text-xs">كابينة توزيع C (مثلثية)</div>
                      <div className="text-[10px] text-slate-400">رمز الكبينة بنصفين أصفر وأزرق</div>
                    </div>
                  </div>
                  {(activeTool === 'cabinet' || activeTool === 'substation_cross') && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                {/* نقطة خدمة SP */}
                <button
                  onClick={() => handleSelectTool('sp')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'sp' ? 'bg-teal-600/30 text-teal-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-blue-600 bg-gradient-to-r from-yellow-300 to-green-400 shrink-0 shadow-xs" />
                    <div>
                      <div className="font-bold text-xs">نقطة خدمة SP (Service Point)</div>
                      <div className="text-[10px] text-slate-400">دائرة الخدمة المعتمدة في كروكي البلاغ</div>
                    </div>
                  </div>
                  {activeTool === 'sp' && <Check className="w-3.5 h-3.5 text-teal-400" />}
                </button>

                {/* رمز الاشتراك / عداد كهرباء مع كسر 2658/3853 */}
                <button
                  onClick={() => handleSelectTool('subscription')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'subscription' ? 'bg-blue-600/30 text-blue-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 border border-blue-600 bg-white relative shrink-0 shadow-xs flex items-center overflow-hidden">
                      <div className="w-[42%] h-full border-r border-blue-600 bg-blue-100/60 flex flex-col justify-around py-0.5">
                        <div className="w-full h-px bg-blue-600 transform -rotate-45" />
                        <div className="w-full h-px bg-blue-600 transform -rotate-45" />
                      </div>
                      <div className="w-[58%] h-full flex items-center justify-center">
                        <div className="w-2 h-2 border border-green-600 bg-green-200 rounded-xs" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-blue-300">اشتراك / عداد كهرباء (رمز معتمد)</div>
                      <div className="text-[10px] text-slate-400">رمز الاشتراك مع كسر العداد (مثل 2658 / 3853)</div>
                    </div>
                  </div>
                  {activeTool === 'subscription' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                {/* مفصل كيبل */}
                <button
                  onClick={() => handleSelectTool('joint')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'joint' ? 'bg-rose-600/30 text-rose-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">مفصل / لحام كيبل (Joint)</div>
                      <div className="text-[10px] text-slate-400">نقطة لحام وتوصيل على الخط</div>
                    </div>
                  </div>
                  {activeTool === 'joint' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </button>

                {/* سهم الشمال */}
                <button
                  onClick={() => handleSelectTool('north')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'north' ? 'bg-slate-600/40 text-white font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">سهم اتجاه الشمال (N)</div>
                      <div className="text-[10px] text-slate-400">بوصلة التوجيه المساحي المعتمدة</div>
                    </div>
                  </div>
                  {activeTool === 'north' && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* Custom Tools Pinned */}
                {customTools.length > 0 && (
                  <>
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 bg-slate-900/70 mt-1 border-t border-slate-700/60">
                      رموز مخصصة مثبتة:
                    </div>
                    {customTools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => handleSelectTool(tool.id)}
                        className={`w-full text-right px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-700/80 ${
                          activeTool === tool.id ? 'bg-amber-600/30 text-amber-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: tool.color }}
                          />
                          <span>{tool.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({tool.defaultLabel})</span>
                        </div>
                        {activeTool === tool.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    ))}
                  </>
                )}

                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenCustomToolModal();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2 hover:bg-slate-700 text-emerald-400 font-bold border-t border-slate-700/60 mt-1"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>+ إنشاء رمز جديد وتثبيته بالشريط</span>
                </button>
              </div>
            )}
          </div>

          {/* القائمة 5: كتابة النصوص والملاحظات في أي مكان على النموذج */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('text_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                openMenu === 'text_menu' || activeTool === 'text' || activeTool === 'textbox' || isAddPageTextActive
                  ? 'bg-indigo-900/70 text-indigo-200 shadow-xs'
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5 text-indigo-400" />
              <span>إضافة نص كتابي</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'text_menu' && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40 text-xs">
                {/* 1. نص حر على الكروكي */}
                <button
                  onClick={() => handleSelectTool('text')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'text' ? 'bg-indigo-600/30 text-indigo-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Type className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">كتابة نص حر على الكروكي (T)</div>
                      <div className="text-[10px] text-slate-400">انقر في أي مكان من المخطط لكتابة نص مباشر</div>
                    </div>
                  </div>
                  {activeTool === 'text' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                {/* 2. مربع نصي بإطار */}
                <button
                  onClick={() => handleSelectTool('textbox')}
                  className={`w-full text-right px-3.5 py-2 flex items-center justify-between hover:bg-slate-700/80 ${
                    activeTool === 'textbox' ? 'bg-indigo-600/30 text-indigo-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border border-dashed border-indigo-400 rounded flex items-center justify-center text-[9px] font-bold text-indigo-300">
                      T
                    </div>
                    <div>
                      <div className="font-bold text-white">مربع نصي محدد (Text Box)</div>
                      <div className="text-[10px] text-slate-400">مربع بمقاس قابل للتغيير مع إطار وملاحظات</div>
                    </div>
                  </div>
                  {activeTool === 'textbox' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                {/* 3. نص حر عائم على كامل النموذج في أي مكان من الصفحة */}
                {onTogglePageText && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onTogglePageText();
                    }}
                    className={`w-full text-right px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-700/80 border-t border-slate-700/60 ${
                      isAddPageTextActive ? 'bg-purple-900/40 text-purple-300 font-bold' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">📄</span>
                      <div>
                        <div className="font-bold text-purple-300 flex items-center gap-1.5">
                          <span>نص حر على كامل الصفحة</span>
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-bold">في أي مكان</span>
                        </div>
                        <div className="text-[10px] text-slate-400">إضافة نص فوق الترويسة أو التذييل أو أي ركن بالنموذج</div>
                      </div>
                    </div>
                    {isAddPageTextActive && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                )}

                {/* 4. نصوص وعبارات مساحية جاهزة بنقرة واحدة */}
                <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 bg-slate-900/70 mt-1 border-t border-slate-700/60">
                  عبارات مساحية وهندسية جاهزة:
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 bg-slate-900/30">
                  {[
                    'شارع عرض 15م',
                    'شارع عرض 20م',
                    'مبنى سكني',
                    'أرض فضاء',
                    'حدود الملكية',
                    'مسار مقترح',
                    'ملاحظة هامة:',
                    'رقم القطعة:',
                  ].map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        onInsertPresetText?.(phrase);
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-700/70 hover:bg-indigo-600 hover:text-white text-slate-200 rounded border border-slate-600 transition-colors text-right truncate"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* القائمة 6: أختام وتواقيع وصور */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('stamps_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                openMenu === 'stamps_menu' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Stamp className="w-3.5 h-3.5 text-orange-400" />
              <span>أختام وتواقيع</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'stamps_menu' && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40">
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenSignatureModal();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-slate-200"
                >
                  <PenTool className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">توقيع إلكتروني باليد</div>
                    <div className="text-[10px] text-slate-400">رسم التوقيع باللمس أو الماوس</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenSignatureModal();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-slate-200"
                >
                  <Stamp className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">ختم رسمي معتمد</div>
                    <div className="text-[10px] text-slate-400">توليد ختم دائري رسمي مع التاريخ</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenImageUpload();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-cyan-300 border-t border-slate-700/60"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">إدراج صورة من الجهاز</div>
                    <div className="text-[10px] text-slate-400">رفع صورة أو كروكي يدوي للمخطط</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* القائمة 6: عرض وتحكم CAD */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('view_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                openMenu === 'view_menu' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>تحكم وعرض CAD</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'view_menu' && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-[9999] space-y-1.5 animate-in fade-in duration-150 ring-1 ring-black/40">
                <button
                  onClick={() => setOrthoMode((prev) => !prev)}
                  className={`w-full text-right px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    orthoMode ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40' : 'hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <div>
                    <div>وضع التعامد الأوتوكادي ORTHO 90°</div>
                    <div className="text-[10px] text-slate-400 font-normal">خطوط عمودية وأفقية بدقة زاوية قائمة (F8)</div>
                  </div>
                  <span className={`w-3 h-3 rounded-full shrink-0 ${orthoMode ? 'bg-green-400 shadow-sm shadow-green-400 animate-pulse' : 'bg-slate-600'}`} />
                </button>

                <button
                  onClick={() => setShowGrid((prev) => !prev)}
                  className={`w-full text-right px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    showGrid ? 'bg-blue-600/30 text-blue-300 font-bold' : 'hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>إظهار شبكة الرسم Grid</span>
                  <Grid className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => setSnapToGrid((prev) => !prev)}
                  className={`w-full text-right px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    snapToGrid ? 'bg-green-600/30 text-green-300 font-bold' : 'hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>محاذاة النقاط للشبكة Snap</span>
                  <Magnet className="w-4 h-4 text-slate-400" />
                </button>

                <div className="flex items-center justify-between border-t border-slate-700/80 pt-2 px-1 text-xs">
                  <span className="text-slate-400">التكبير:</span>
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                      className="p-1 hover:text-white text-slate-400"
                      title="تصغير"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] px-1 text-slate-200">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
                      className="p-1 hover:text-white text-slate-400"
                      title="تكبير"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom(1)}
                      className="p-1 hover:text-white text-slate-500"
                      title="100%"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* القائمة 7: تصدير وطباعة */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('export_menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                openMenu === 'export_menu' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>تصدير وطباعة</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'export_menu' && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[9999] animate-in fade-in duration-150 ring-1 ring-black/40">
                {onOpenDriveModal && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onOpenDriveModal();
                    }}
                    className="w-full text-right px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-slate-700/90 text-emerald-300 font-bold bg-emerald-950/30 border-b border-slate-700/70"
                  >
                    <div className="w-5 h-5 flex items-center justify-center bg-white rounded-md p-0.5 shrink-0 shadow-xs">
                      <svg viewBox="0 0 87.3 78" className="w-full h-full">
                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3L30 50.8 16.3 27.2 6.6 44c-1.3 2.2-2 4.8-2 7.4.1 2.7.8 5.2 2 7.45z" fill="#0066da"/>
                        <path d="M43.65 25l16.3-28.2c-1.3-.8-2.7-1.3-4.2-1.6-1.5-.3-3-.3-4.5 0H16.3c-1.5.3-3 .8-4.2 1.6L27.4 25h16.25z" fill="#00ac47"/>
                        <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.8-3.1c1.2-2.1 1.9-4.5 2-7 .1-2.5-.5-5-1.7-7.2L64.2 31.8 50.5 55.4l16.35 28.2c2.4-.4 4.8-1.5 6.7-2.8z" fill="#ea4335"/>
                        <path d="M43.65 25L30 50.8h34.2L77.9 25H43.65z" fill="#ffba00"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">حفظ على Google Drive ومشاركة</div>
                      <div className="text-[10px] text-slate-300 font-normal">حفظ سحابي ومنح صلاحيات فتح الدرايف</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onExportPdf();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-red-400 font-bold"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="text-xs">تنزيل وحفظ PDF على الجهاز</div>
                    <div className="text-[10px] text-slate-400 font-normal">ملف PDF مساحي عالي الدقة بحجم A4</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onExportPng();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-slate-200 border-t border-slate-700/60"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-white">تصدير صورة PNG</div>
                    <div className="text-[10px] text-slate-400">حفظ صورة واضحة ومباشرة</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onPrint();
                  }}
                  className="w-full text-right px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 text-slate-200 border-t border-slate-700/60"
                >
                  <Printer className="w-4 h-4 text-slate-300 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-white">طباعة فورية</div>
                    <div className="text-[10px] text-slate-400">إرسال مباشر إلى الطابعة</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Left side of Top Menu Bar: Direct Drive Save & PDF Save Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Tool Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px]">
            <span className="text-slate-400">الأداة:</span>
            <span className="font-bold text-amber-400">{getToolDisplayName(activeTool)}</span>
            {activeTool !== 'select' && (
              <button
                onClick={() => setActiveTool('select')}
                className="p-0.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
                title="إلغاء والعودة لأداة الاختيار"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Prominent Google Drive Save & Share Button */}
          {onOpenDriveModal && (
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold transition-all shadow-md shrink-0 border border-emerald-400/60"
              title="حفظ الصور والرسومات على Google Drive ومشاركة الصلاحيات"
            >
              <div className="w-4 h-4 flex items-center justify-center bg-white rounded-xs p-0.5 shrink-0 shadow-xs">
                <svg viewBox="0 0 87.3 78" className="w-full h-full">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3L30 50.8 16.3 27.2 6.6 44c-1.3 2.2-2 4.8-2 7.4.1 2.7.8 5.2 2 7.45z" fill="#0066da"/>
                  <path d="M43.65 25l16.3-28.2c-1.3-.8-2.7-1.3-4.2-1.6-1.5-.3-3-.3-4.5 0H16.3c-1.5.3-3 .8-4.2 1.6L27.4 25h16.25z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.8-3.1c1.2-2.1 1.9-4.5 2-7 .1-2.5-.5-5-1.7-7.2L64.2 31.8 50.5 55.4l16.35 28.2c2.4-.4 4.8-1.5 6.7-2.8z" fill="#ea4335"/>
                  <path d="M43.65 25L30 50.8h34.2L77.9 25H43.65z" fill="#ffba00"/>
                </svg>
              </div>
              <span className="text-xs font-extrabold">حفظ ومشاركة على Drive</span>
            </button>
          )}

          {/* Prominent Direct PDF Download Button */}
          <button
            onClick={onExportPdf}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold transition-all shadow-md shrink-0 border border-red-500"
            title="حفظ ملف PDF معتمد مباشرة على جهازك"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs font-extrabold">حفظ PDF على الجهاز</span>
          </button>
        </div>
      </div>

      {/* 2. شريط الأدوات السريع بالرموز المباشرة (Quick CAD Action Toolbar) */}
      <div className="w-full bg-slate-800/95 text-slate-200 border-b border-slate-700/80 px-3 py-1 flex items-center justify-between text-xs gap-2 select-none overflow-x-auto">
        {/* Right side: 1-Click CAD tools */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Select Tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-bold ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
            title="أداة الاختيار والتحريك المباشر (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>تحديد</span>
          </button>

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Quick Cable Buttons */}
          <button
            onClick={() => setActiveTool('cable_kasht')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'cable_kasht'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-blue-300'
            }`}
            title="مسار كشط أسفلت مع كيبل {صورة 5584}"
          >
            <span className="w-2.5 h-1 border border-dashed border-blue-400 bg-blue-500/30 rounded-xs" />
            <span>الكشط</span>
          </button>

          <button
            onClick={() => setActiveTool('cable_as')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'cable_as'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-blue-300'
            }`}
            title="مسار كيبل أسفلت {AS}"
          >
            <span className="w-2.5 h-1 bg-blue-500 rounded-full" />
            <span>كيبل AS</span>
          </button>

          <button
            onClick={() => setActiveTool('cable_ng')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'cable_ng'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-amber-300'
            }`}
            title="مسار كيبل ترابي {NG}"
          >
            <span className="w-2.5 h-1 bg-amber-500 rounded-full" />
            <span>كيبل NG</span>
          </button>

          <button
            onClick={() => setActiveTool('cable_t')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'cable_t'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-emerald-300'
            }`}
            title="مسار كيبل بلاط {T}"
          >
            <span className="w-2.5 h-1 bg-emerald-500 rounded-full" />
            <span>كيبل T</span>
          </button>

          <button
            onClick={() => setActiveTool('cable_dashed')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'cable_dashed'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-blue-300'
            }`}
            title="رسم خط متقطع (منقوط مع الطول)"
          >
            <span className="w-3 h-0.5 border-b-2 border-dashed border-blue-400" />
            <span>خط متقطع</span>
          </button>

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Quick Station Symbols */}
          {/* 1. محطة تحويل (بخطين عكسيين متقاطعين ⤫) */}
          <button
            onClick={() => setActiveTool('substation')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'substation'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-amber-200'
            }`}
            title="محطة تحويل (بخطين عكسيين متقاطعين ⤫)"
          >
            <div className="w-4 h-3 border border-black bg-yellow-200 flex items-center justify-center">
              <svg viewBox="0 0 20 14" className="w-full h-full">
                <line x1="0" y1="0" x2="20" y2="14" stroke="#000" strokeWidth="1.5" />
                <line x1="20" y1="0" x2="0" y2="14" stroke="#000" strokeWidth="1.5" />
              </svg>
            </div>
            <span>محطة ⤫</span>
          </button>

          {/* 2. كابينة توزيع C المثلثية */}
          <button
            onClick={() => setActiveTool('cabinet')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'cabinet' || activeTool === 'substation_cross'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
            title="كابينة توزيع C (مثلثية)"
          >
            <div className="w-3.5 h-3 border border-black relative overflow-hidden bg-yellow-400">
              <div
                className="absolute inset-0 bg-blue-700"
                style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
              />
            </div>
            <span>كبينة C</span>
          </button>

          {/* نقطة خدمة SP */}
          <button
            onClick={() => setActiveTool('sp')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'sp'
                ? 'bg-teal-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
            title="نقطة خدمة SP"
          >
            <div className="w-3 h-3 rounded-full border border-blue-600 bg-gradient-to-r from-yellow-300 to-green-400" />
            <span>نقطة SP</span>
          </button>

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Shapes & Annotations */}
          <button
            onClick={() => setActiveTool('line')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'line' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'
            }`}
            title="خط عادي / شارع (L)"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('dimension')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'dimension' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-rose-300'
            }`}
            title="أداة قياس بُعد ومسافة (D)"
          >
            <Ruler className="w-4 h-4" />
          </button>

          {/* زر كتابة نص حر */}
          <button
            onClick={() => setActiveTool('text')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-bold ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-700 text-indigo-300'
            }`}
            title="كتابة نص حر في أي مكان من المخطط (T)"
          >
            <Type className="w-4 h-4" />
            <span>نص حر</span>
          </button>

          {/* زر المربع النصي السريع */}
          <button
            onClick={() => setActiveTool('textbox')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors font-medium ${
              activeTool === 'textbox'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-700 text-indigo-300'
            }`}
            title="إنشاء مربع نصي محدد للملاحظات والعناوين"
          >
            <div className="w-3.5 h-3 border border-dashed border-current flex items-center justify-center text-[9px] font-bold">
              T
            </div>
            <span>مربع نصي</span>
          </button>

          {/* زر إضافة نص في أي مكان على كامل النموذج */}
          {onTogglePageText && (
            <button
              onClick={() => onTogglePageText()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all font-bold ${
                isAddPageTextActive
                  ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/50 animate-pulse'
                  : 'hover:bg-slate-700 text-purple-300'
              }`}
              title="إمكانية إضافة نص كتابي على النموذج في أي مكان من الصفحة (فوق الجداول أو الهوامش)"
            >
              <span>📄</span>
              <span>نص على الصفحة</span>
            </button>
          )}

          <button
            onClick={() => setActiveTool('joint')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'joint' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-amber-400'
            }`}
            title="مفصل / لحام"
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('north')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'north' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-rose-400'
            }`}
            title="سهم الشمال N"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Quick Line Length Adjuster when a line is selected */}
          {selectedElement &&
            (selectedElement.type === 'line' || selectedElement.type === 'dimension') &&
            onQuickLengthen && (
              <>
                <span className="w-px h-5 bg-slate-700 mx-1" />
                <div className="flex items-center gap-1 bg-slate-900 border border-blue-500/50 rounded-lg px-2 py-0.5">
                  <span className="text-[11px] text-slate-400">الطول:</span>
                  <span className="font-mono font-bold text-amber-300 text-xs px-1">
                    {selectedElement.label || ''}
                  </span>
                  <div className="flex items-center gap-0.5 mr-1 border-r border-slate-700 pr-1">
                    <button
                      onClick={() => onQuickLengthen(1)}
                      className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded text-[11px]"
                      title="زيادة طول الخط متر واحد (+1M)"
                    >
                      +1م
                    </button>
                    <button
                      onClick={() => onQuickLengthen(5)}
                      className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded text-[11px]"
                      title="زيادة طول الخط 5 أمتار (+5M)"
                    >
                      +5م
                    </button>
                    <button
                      onClick={() => onQuickLengthen(-1)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300 font-bold rounded text-[11px]"
                      title="إنقاص متر واحد (-1M)"
                    >
                      -1م
                    </button>
                  </div>
                </div>
              </>
            )}

          {/* Selected Symbol Info & Quick Interactive Name Button */}
          {selectedElement &&
            (selectedElement.type === 'symbol' ||
              selectedElement.type === 'custom_symbol' ||
              selectedElement.symbolKind !== undefined) && (
              <>
                <span className="w-px h-5 bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => onEditSymbolName?.(selectedElement)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-black shadow-md border border-amber-300 transition-all cursor-pointer ring-1 ring-amber-400/50"
                  title="انقر هنا لتحرير اسم أو رقم هذا الرمز وموضعه فوراً"
                >
                  <span className="text-sm">✏️</span>
                  <span>تعديل اسم أو رقم الرمز:</span>
                  <span className="bg-slate-950/20 px-2 py-0.5 rounded text-slate-950 font-mono">
                    {selectedElement.label || selectedElement.text || 'رمز'}
                  </span>
                </button>
              </>
            )}
        </div>

        {/* Left side: CAD Controls & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ortho 90° toggle */}
          <button
            onClick={() => setOrthoMode((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all border ${
              orthoMode
                ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30'
                : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'
            }`}
            title="وضع التعامد الأوتوكادي ORTHO 90° (F8)"
          >
            <span>ORTHO</span>
            <span
              className={`w-2 h-2 rounded-full ${
                orthoMode ? 'bg-green-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </button>

          {/* Grid & Snap quick toggles */}
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            className={`p-1.5 rounded transition-colors ${
              showGrid ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'
            }`}
            title="إظهار / إخفاء الشبكة"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSnapToGrid((prev) => !prev)}
            className={`p-1.5 rounded transition-colors ${
              snapToGrid ? 'bg-green-600 text-white' : 'hover:bg-slate-700 text-slate-400'
            }`}
            title="محاذاة النقاط للشبكة Snap"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="تراجع (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="إعادة (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          {selectedElementId && (
            <button
              onClick={onDeleteSelected}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors"
              title="حذف العنصر المحدد (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>
          )}

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 rounded p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              className="p-1 hover:text-white text-slate-400"
              title="تصغير"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px] px-1 text-slate-300">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(1))))}
              className="p-1 hover:text-white text-slate-400"
              title="تكبير"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:text-white text-slate-500"
              title="إعادة ضبط 100%"
            >
              <Maximize2 className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Quick Drive Button */}
          {onOpenDriveModal && (
            <>
              <span className="w-px h-5 bg-slate-700 mx-1" />
              <button
                onClick={onOpenDriveModal}
                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-bold transition-colors shadow-xs"
                title="حفظ الكروكي في Google Drive ومشاركة الصلاحيات"
              >
                <div className="w-3.5 h-3 flex items-center justify-center bg-white rounded-xs p-0.5 shrink-0">
                  <svg viewBox="0 0 87.3 78" className="w-full h-full">
                    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3L30 50.8 16.3 27.2 6.6 44c-1.3 2.2-2 4.8-2 7.4.1 2.7.8 5.2 2 7.45z" fill="#0066da"/>
                    <path d="M43.65 25l16.3-28.2c-1.3-.8-2.7-1.3-4.2-1.6-1.5-.3-3-.3-4.5 0H16.3c-1.5.3-3 .8-4.2 1.6L27.4 25h16.25z" fill="#00ac47"/>
                    <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l1.8-3.1c1.2-2.1 1.9-4.5 2-7 .1-2.5-.5-5-1.7-7.2L64.2 31.8 50.5 55.4l16.35 28.2c2.4-.4 4.8-1.5 6.7-2.8z" fill="#ea4335"/>
                    <path d="M43.65 25L30 50.8h34.2L77.9 25H43.65z" fill="#ffba00"/>
                  </svg>
                </div>
                <span>Drive</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
