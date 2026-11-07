import React, { useState, useRef, useEffect } from 'react';
import {
  WorkOrderData,
  CanvasElement,
  CadTool,
  CustomTool,
  PageAnnotation,
} from './types';
import {
  TEMPLATE_1_IMG_5555,
  TEMPLATE_2_IMG_5554,
  TEMPLATE_3_IMG_5583,
  TEMPLATE_4_IMG_5584,
  INITIAL_CUSTOM_TOOLS,
} from './constants/defaultWorkOrders';
import { HeaderTable } from './components/HeaderTable';
import { FooterTable } from './components/FooterTable';
import { CadCanvas } from './components/CadCanvas';
import { CadToolbar } from './components/CadToolbar';
import { PageTextOverlay } from './components/PageTextOverlay';
import { WorkOrderModal } from './components/WorkOrderModal';
import { CustomToolModal } from './components/CustomToolModal';
import { SignatureModal } from './components/SignatureModal';
import { DriveModal } from './components/DriveModal';
import { ElementPropertiesModal } from './components/ElementPropertiesModal';
import { SymbolEditModal } from './components/SymbolEditModal';
import { exportToPdf, exportToPng } from './utils/exportPdf';
import {
  getLineLengthInfo,
  resizeLineElement,
  calculateTotalsFromElements,
} from './utils/lineLengthUtils';
import {
  Layers,
  FileSpreadsheet,
  Download,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Eye,
  Sliders,
  CheckCircle2,
  Trash2,
  Ruler,
  Plus,
  Minus,
} from 'lucide-react';

export default function App() {
  // Current Work Order state - defaults to Template 1 (matching IMG_5555)
  const [workOrder, setWorkOrder] = useState<WorkOrderData>(
    TEMPLATE_1_IMG_5555.workOrder
  );

  // Canvas elements state
  const [elements, setElements] = useState<CanvasElement[]>(
    TEMPLATE_1_IMG_5555.elements
  );

  // Undo / Redo history
  const [history, setHistory] = useState<CanvasElement[][]>([
    TEMPLATE_1_IMG_5555.elements,
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Active CAD Tool
  const [activeTool, setActiveTool] = useState<CadTool>('select');

  // CAD Modes
  const [orthoMode, setOrthoMode] = useState<boolean>(true); // Ortho 90° enabled by default for engineering CAD
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Custom Tools created and pinned by user
  const [customTools, setCustomTools] = useState<CustomTool[]>(INITIAL_CUSTOM_TOOLS);

  // Modals state
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureTargetRole, setSignatureTargetRole] = useState<
    keyof WorkOrderData['approvals'] | undefined
  >(undefined);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceTab, setReferenceTab] = useState<'5555' | '5554' | '5583' | '5584'>('5584');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [inspectedElementId, setInspectedElementId] = useState<string | null>(null);
  const [symbolToEdit, setSymbolToEdit] = useState<CanvasElement | null>(null);

  // Preset cable length lock state ('قائمة رسم طول الكيبل')
  const [presetCableLength, setPresetCableLength] = useState<number | null>(null);

  // Page-wide floating text annotations (كتابة أي نص في أي مكان على كامل الصفحة)
  const [pageAnnotations, setPageAnnotations] = useState<PageAnnotation[]>([]);
  const [isAddPageTextActive, setIsAddPageTextActive] = useState<boolean>(false);

  // Insert predefined engineering text onto the drawing
  const handleInsertPresetText = (preset: string) => {
    const newEl: CanvasElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 350,
      y: 350,
      text: preset,
      strokeColor: '#0f172a',
      strokeWidth: 1,
      fontSize: 13,
      fontWeight: 'bold',
      isBoxed: preset.includes('ملاحظة') || preset.includes('قطعة'),
    };
    const updated = [...elements, newEl];
    setElements(updated);
    handleElementsChange(updated);
    setSelectedElementId(newEl.id);
    setActiveTool('select');
  };

  // File input ref for inserting images onto canvas
  const imageUploadRef = useRef<HTMLInputElement | null>(null);

  // Line length elongation settings in inspector
  const [inspectorAnchor, setInspectorAnchor] = useState<'start' | 'end' | 'center'>('start');
  const [moveConnectedSymbols, setMoveConnectedSymbols] = useState<boolean>(true);
  const [autoSyncWorkOrder, setAutoSyncWorkOrder] = useState<boolean>(true);

  // Insert a predefined cable with exact length and orientation
  const handleInsertPredefinedCable = (
    meters: number,
    type: 'KASHT' | 'AS' | 'NG' | 'T' | 'DASHED',
    direction: 'vertical' | 'horizontal'
  ) => {
    const pxLen = meters * 25; // 25 px per meter
    const startX = 350;
    const startY = direction === 'vertical' ? 220 : 350;
    const endX = direction === 'horizontal' ? startX + pxLen : startX;
    const endY = direction === 'vertical' ? startY + pxLen : startY;

    const isDashed = type === 'DASHED';
    const newCable: CanvasElement = {
      id: `cable-${type.toLowerCase()}-${Date.now()}`,
      type: 'line',
      x: startX,
      y: startY,
      x2: endX,
      y2: endY,
      strokeColor: type === 'T' ? '#059669' : '#0022cc',
      strokeWidth: type === 'KASHT' ? 2.8 : isDashed ? 2.2 : 2.5,
      strokeStyle: isDashed ? 'dashed' : 'solid',
      soilType: isDashed ? 'AS' : type,
      isMilling: type === 'KASHT',
      label: isDashed
        ? `AS ${meters}.00M`
        : `${type === 'KASHT' ? 'كشط ' : type === 'NG' ? 'NG' : `${type} `}${meters}.0M`,
      labelPosition: direction === 'vertical' ? 'left' : 'top',
      labelSide: 'left',
    };

    const updated = [...elements, newCable];
    setElements(updated);
    handleElementsChange(updated);
    setSelectedElementId(newCable.id);
    setActiveTool('select');
  };

  // Resize line with options - trench, asphalt, soil, tile lengths in header are edited manually by user
  const handleResizeLine = (lineId: string, targetMeters: number) => {
    const updated = resizeLineElement(elements, lineId, targetMeters, {
      anchor: inspectorAnchor,
      updateLabel: true,
      moveConnectedSymbols: moveConnectedSymbols,
    });
    setElements(updated);
    handleElementsChange(updated);
    // Manual lengths (trench, asphalt, soil, tile) are preserved and never automatically overwritten
  };

  // Update history on elements change
  const handleElementsChange = (newElements: CanvasElement[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newElements);
    if (updatedHistory.length > 30) {
      updatedHistory.shift();
    }
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter((el) => el.id !== selectedElementId);
    setElements(updated);
    handleElementsChange(updated);
    setSelectedElementId(null);
  };

  // Keyboard shortcuts (Del, Esc, Ctrl+Z, Ctrl+Y, Ortho F8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedElementId(null);
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        handleRedo();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setOrthoMode((prev) => !prev);
      } else if (e.key === 'F2') {
        if (selectedElementId) {
          const el = elements.find((x) => x.id === selectedElementId);
          if (el) {
            e.preventDefault();
            setSymbolToEdit(el);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, historyIndex, history]);

  // Load a complete preset
  const handleLoadTemplate = (preset: {
    workOrder: WorkOrderData;
    elements: CanvasElement[];
  }) => {
    setWorkOrder(preset.workOrder);
    setElements(preset.elements);
    setHistory([preset.elements]);
    setHistoryIndex(0);
    setSelectedElementId(null);
  };

  // Auto-calculate lengths from drawn lines
  const handleAutoCalculateLengths = () => {
    let totalAsphalt = 0;
    let totalSoil = 0;
    let totalTile = 0;

    elements.forEach((el) => {
      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
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

    setWorkOrder((prev) => ({
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

  // State for export feedback toast
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Insert image onto canvas
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newEl: CanvasElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          x: 200,
          y: 250,
          width: 160,
          height: 110,
          imageUrl: event.target?.result as string,
          strokeColor: 'transparent',
          strokeWidth: 0,
        };
        const updated = [...elements, newEl];
        setElements(updated);
        handleElementsChange(updated);
        setSelectedElementId(newEl.id);
      };
      reader.readAsDataURL(file);
    }
  };

  // Insert stamp or signature onto canvas
  const handleInsertSignatureOrStamp = (
    dataUrl: string,
    type: 'signature' | 'stamp'
  ) => {
    const newEl: CanvasElement = {
      id: `${type}-${Date.now()}`,
      type: type,
      x: 350,
      y: 450,
      width: type === 'stamp' ? 90 : 120,
      height: type === 'stamp' ? 90 : 50,
      imageUrl: dataUrl,
      strokeColor: 'transparent',
      strokeWidth: 0,
    };
    const updated = [...elements, newEl];
    setElements(updated);
    handleElementsChange(updated);
    setSelectedElementId(newEl.id);
  };

  // Apply signature to a specific approval role in footer table
  const handleApplySignatureToRole = (
    roleKey: keyof WorkOrderData['approvals'],
    dataUrl: string
  ) => {
    setWorkOrder((prev) => ({
      ...prev,
      approvals: {
        ...prev.approvals,
        [roleKey]: {
          ...prev.approvals[roleKey],
          signature: dataUrl,
          date: prev.approvals[roleKey]?.date || prev.deliveryDate || '30/5/2026',
        },
      },
    }));
  };

  const handleOpenRoleSignature = (
    roleKey: keyof WorkOrderData['approvals'],
    field: 'name' | 'date' | 'signature'
  ) => {
    if (field === 'signature') {
      setSignatureTargetRole(roleKey);
      setIsSignatureModalOpen(true);
    }
    // Inline text editing handles name and date directly in table cells
  };

  const handleExportPdf = async () => {
    setExportStatus('جاري تجهيز وحفظ ملف PDF على جهازك...');
    try {
      const fileName = `كروكي-بلاغ-${workOrder.orderNumber || 'مساحي'}.pdf`;
      const success = await exportToPdf('printable-survey-sheet', fileName);
      if (success) {
        setExportStatus(`تم تنزيل وحفظ ملف (${fileName}) على جهازك بنجاح!`);
        setTimeout(() => setExportStatus(null), 4500);
      } else {
        setExportStatus('تم استدعاء مربع الحفظ والطباعة.');
        setTimeout(() => setExportStatus(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setExportStatus('تعذر التصدير تلقائياً. تم فتح نافذة الطباعة كبديل.');
      setTimeout(() => setExportStatus(null), 4000);
    }
  };

  const handleExportPng = async () => {
    setExportStatus('جاري حفظ صورة PNG عالية الدقة...');
    try {
      const fileName = `كروكي-بلاغ-${workOrder.orderNumber || 'مساحي'}.png`;
      const success = await exportToPng('printable-survey-sheet', fileName);
      if (success) {
        setExportStatus(`تم تنزيل وحفظ صورة (${fileName}) بنجاح!`);
        setTimeout(() => setExportStatus(null), 4000);
      } else {
        setExportStatus(null);
      }
    } catch {
      setExportStatus(null);
    }
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-['Cairo',sans-serif] text-slate-800">
      {/* Toast Notification for Exporting and Operations */}
      {exportStatus && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl border border-orange-500/50 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shrink-0" />
          <span>{exportStatus}</span>
          <button
            onClick={() => setExportStatus(null)}
            className="text-slate-400 hover:text-white mr-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Single Compact Unified Top Bar with Categorized Dropdown Menus */}
      <CadToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        orthoMode={orthoMode}
        setOrthoMode={setOrthoMode}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelected={handleDeleteSelected}
        selectedElementId={selectedElementId}
        selectedElement={selectedElement}
        onQuickLengthen={(delta) => {
          if (selectedElement) {
            const currentM = getLineLengthInfo(selectedElement)?.lengthMeters || 0;
            handleResizeLine(selectedElement.id, Math.max(0.5, currentM + delta));
          }
        }}
        zoom={zoom}
        setZoom={setZoom}
        customTools={customTools}
        onOpenCustomToolModal={() => setIsCustomToolModalOpen(true)}
        onOpenSignatureModal={() => {
          setSignatureTargetRole(undefined);
          setIsSignatureModalOpen(true);
        }}
        onOpenImageUpload={() => imageUploadRef.current?.click()}
        onOpenWorkOrderModal={() => setIsWorkOrderModalOpen(true)}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        onPrint={() => window.print()}
        onLoadTemplate1={() => handleLoadTemplate(TEMPLATE_1_IMG_5555)}
        onLoadTemplate2={() => handleLoadTemplate(TEMPLATE_2_IMG_5554)}
        onLoadTemplate3={() => handleLoadTemplate(TEMPLATE_3_IMG_5583)}
        onAutoCalculateLengths={handleAutoCalculateLengths}
        onOpenReferenceModal={() => setShowReferenceModal(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        isAddPageTextActive={isAddPageTextActive}
        onTogglePageText={() => setIsAddPageTextActive((prev) => !prev)}
        onInsertPresetText={handleInsertPresetText}
        onEditSymbolName={(el) => setSymbolToEdit(el)}
      />

      {/* Hidden File Input for Canvas Image Insert */}
      <input
        ref={imageUploadRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas Scroll Viewport */}
        <main className="flex-1 overflow-auto bg-slate-200/80 p-6 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="my-2"
          >
            {/* The Authentic Engineering Sheet Frame matching IMG_5554 & IMG_5555 */}
            <div
              id="printable-survey-sheet"
              className="bg-white shadow-2xl border-[3px] border-[#ea7c15] flex flex-col justify-between overflow-hidden relative"
              style={{
                width: '740px',
                height: '1046px', // Standard A4 ratio ~ 1:1.414
              }}
            >
              {/* 1. Header Information Table (with ALJUAN logo & breakdown) */}
              <div className="w-full flex-shrink-0">
                <HeaderTable
                  workOrder={workOrder}
                  setWorkOrder={setWorkOrder}
                  interactive={true}
                />
              </div>

              {/* 2. Middle Interactive CAD Drawing Area */}
              <div className="w-full flex-1 relative overflow-hidden bg-white">
                <CadCanvas
                  elements={elements}
                  setElements={setElements}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  orthoMode={orthoMode}
                  snapToGrid={snapToGrid}
                  showGrid={showGrid}
                  selectedElementId={selectedElementId}
                  setSelectedElementId={setSelectedElementId}
                  customTools={customTools}
                  onElementsChange={handleElementsChange}
                  onAutoCalculateLengths={handleAutoCalculateLengths}
                  onDoubleClickElement={(el) => setInspectedElementId(el.id)}
                  onEditSymbolName={(el) => setSymbolToEdit(el)}
                  width={734}
                  height={742}
                />
              </div>

              {/* 3. Bottom Signatures & Approvals Table */}
              <div className="w-full flex-shrink-0">
                <FooterTable
                  workOrder={workOrder}
                  setWorkOrder={setWorkOrder}
                  onEditCell={handleOpenRoleSignature}
                  interactive={true}
                />
              </div>

              {/* 4. Page-Wide Text Overlay (إمكانية كتابة نص في أي مكان على كامل الصفحة والنموذج) */}
              <PageTextOverlay
                annotations={pageAnnotations}
                setAnnotations={setPageAnnotations}
                isAddPageTextActive={isAddPageTextActive}
                setIsAddPageTextActive={setIsAddPageTextActive}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {/* 1. Work Order Form Modal */}
      <WorkOrderModal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        workOrder={workOrder}
        onSave={setWorkOrder}
        onLoadTemplate={handleLoadTemplate}
        elements={elements}
      />

      {/* 2. Custom Tool Modal */}
      <CustomToolModal
        isOpen={isCustomToolModalOpen}
        onClose={() => setIsCustomToolModalOpen(false)}
        customTools={customTools}
        setCustomTools={setCustomTools}
        onSelectTool={(id) => {
          setActiveTool(id);
          setIsCustomToolModalOpen(false);
        }}
      />

      {/* 3. Signature & Stamp Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onInsertToCanvas={handleInsertSignatureOrStamp}
        onApplyToRole={handleApplySignatureToRole}
        initialRole={signatureTargetRole}
      />

      {/* 4. Google Drive Save & Collaboration Permissions Modal */}
      <DriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        workOrder={workOrder}
        canvasContainerId="printable-survey-sheet"
      />

      {/* 5. Selected Element Properties Floating Modal (Opens ONLY on Double-Click) */}
      <ElementPropertiesModal
        isOpen={!!inspectedElementId}
        onClose={() => setInspectedElementId(null)}
        element={elements.find((el) => el.id === inspectedElementId) || null}
        elements={elements}
        onElementsChange={handleElementsChange}
        onResizeLine={handleResizeLine}
        onDeleteElement={(id) => {
          const updated = elements.filter((el) => el.id !== id);
          setElements(updated);
          handleElementsChange(updated);
          if (selectedElementId === id) setSelectedElementId(null);
          setInspectedElementId(null);
        }}
        onAutoCalculateLengths={handleAutoCalculateLengths}
        inspectorAnchor={inspectorAnchor}
        setInspectorAnchor={setInspectorAnchor}
        moveConnectedSymbols={moveConnectedSymbols}
        setMoveConnectedSymbols={setMoveConnectedSymbols}
        autoSyncWorkOrder={autoSyncWorkOrder}
        setAutoSyncWorkOrder={setAutoSyncWorkOrder}
      />

      {/* 6. Dedicated Symbol Name / Number Quick Edit Modal */}
      <SymbolEditModal
        isOpen={!!symbolToEdit}
        onClose={() => setSymbolToEdit(null)}
        element={symbolToEdit}
        onSave={(updatedEl) => {
          const updated = elements.map((item) => (item.id === updatedEl.id ? updatedEl : item));
          setElements(updated);
          handleElementsChange(updated);
          setSymbolToEdit(null);
        }}
      />

      {/* 7. Reference Image Comparison Modal */}
      {showReferenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Cairo',sans-serif]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold">
                  الصورة الأصلية المرفقة من المستخدم للمقارنة
                </h2>
              </div>
              <button
                onClick={() => setShowReferenceModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-3 text-xs">
              <button
                onClick={() => setReferenceTab('5583')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-all ${
                  referenceTab === '5583'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                الصورة 3 (IMG_5583) - كروكي اشتراك وعداد AS6.0M
              </button>
              <button
                onClick={() => setReferenceTab('5555')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-all ${
                  referenceTab === '5555'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                الصورة 1 (IMG_5555) - زاوية قائمة AS 6M & AS 4M
              </button>
              <button
                onClick={() => setReferenceTab('5554')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-all ${
                  referenceTab === '5554'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                الصورة 2 (IMG_5554) - خط مستقيم NG15M مع محطة C
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
              <img
                src={
                  referenceTab === '5583'
                    ? '/assets/aistudio/IMG_5583_205d9b41.jpeg'
                    : referenceTab === '5555'
                    ? '/assets/aistudio/IMG_5555_48f2d4b7.jpeg'
                    : '/assets/aistudio/IMG_5554_9e9da888.jpeg'
                }
                alt="Reference"
                className="max-h-[68vh] object-contain rounded-lg border border-slate-300 shadow-md"
              />
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                النموذج داخل التطبيق يطابق هذه الصورة تماماً بالهيكل والجداول والألوان.
              </span>
              <button
                onClick={() => {
                  handleLoadTemplate(
                    referenceTab === '5583'
                      ? TEMPLATE_3_IMG_5583
                      : referenceTab === '5555'
                      ? TEMPLATE_1_IMG_5555
                      : TEMPLATE_2_IMG_5554
                  );
                  setShowReferenceModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs"
              >
                تحميل هذا النموذج في المحرر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
