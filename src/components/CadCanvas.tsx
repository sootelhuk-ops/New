import React, { useState, useRef, useEffect } from 'react';
import { CanvasElement, CadTool, Point, SoilType, CustomTool } from '../types';
import {
  getLineLengthInfo,
  formatLineLabel,
  resizeLineElement,
  PIXELS_PER_METER,
} from '../utils/lineLengthUtils';
import { Ruler, Plus, Minus, ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';

interface CadCanvasProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  activeTool: CadTool;
  setActiveTool: (tool: CadTool) => void;
  orthoMode: boolean;
  snapToGrid: boolean;
  showGrid: boolean;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  customTools: CustomTool[];
  onElementsChange?: (newElements: CanvasElement[]) => void;
  width?: number;
  height?: number;
  onAutoCalculateLengths?: () => void;
  onDoubleClickElement?: (element: CanvasElement) => void;
  presetCableLength?: number | null;
  onEditSymbolName?: (element: CanvasElement) => void;
}

interface MillingCorridorProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cableColor?: string;
  cableWidth?: number;
  showCable?: boolean;
}

export const MillingCorridor: React.FC<MillingCorridorProps> = ({
  x1,
  y1,
  x2,
  y2,
  cableColor = '#0022cc',
  cableWidth = 2.8,
  showCable = true,
}) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const totalWidth = 32; // corridor width (عرض مسار الكشط)
  const halfW = 16;
  const laneW = 8;
  const stepH = 10; // spacing between rungs

  const rungsCount = Math.floor(length / stepH);
  const rungs: number[] = [];
  for (let i = 0; i <= rungsCount; i++) {
    rungs.push(i * stepH);
  }
  if (rungs[rungs.length - 1] < length) {
    rungs.push(length);
  }

  const lanes = [
    { yMin: -halfW, yMax: -laneW },
    { yMin: -laneW, yMax: 0 },
    { yMin: 0, yMax: laneW },
    { yMin: laneW, yMax: halfW },
  ];

  return (
    <g transform={`translate(${x1}, ${y1}) rotate(${angle})`} className="pointer-events-none select-none">
      {/* Outer Dashed Boundaries (حدود منطقة الكشط الخارجية المنقطة كما في صورة 5584) */}
      <line
        x1={0}
        y1={-halfW}
        x2={length}
        y2={-halfW}
        stroke="#64748b"
        strokeWidth={1.2}
        strokeDasharray="5 3"
      />
      <line
        x1={0}
        y1={halfW}
        x2={length}
        y2={halfW}
        stroke="#64748b"
        strokeWidth={1.2}
        strokeDasharray="5 3"
      />

      {/* Intermediate longitudinal lane lines (الخطوط الطولية الداخلية الخفيفة) */}
      <line
        x1={0}
        y1={-laneW}
        x2={length}
        y2={-laneW}
        stroke="#cbd5e1"
        strokeWidth={0.9}
      />
      <line
        x1={0}
        y1={laneW}
        x2={length}
        y2={laneW}
        stroke="#cbd5e1"
        strokeWidth={0.9}
      />

      {/* Cross rungs (الخطوط العرضية لتقسيم الكشط) */}
      {rungs.map((rx, idx) => (
        <line
          key={`rung-${idx}`}
          x1={rx}
          y1={-halfW}
          x2={rx}
          y2={halfW}
          stroke="#cbd5e1"
          strokeWidth={0.8}
        />
      ))}

      {/* L-shaped corner notches in each grid cell (نمط وشكل الكشط المعياري في صورة 5584) */}
      {rungs.map((rx, idx) => {
        if (idx === rungs.length - 1) return null;
        const nextX = rungs[idx + 1];
        const cellLen = nextX - rx;
        if (cellLen < 4) return null;

        return (
          <g key={`cells-${idx}`}>
            {lanes.map((lane, lIdx) => {
              const xLeft = rx + 2;
              const xRight = rx + Math.min(cellLen - 2, 7);
              const yTop = lane.yMin + 2;
              const yBottom = lane.yMax - 2;

              return (
                <path
                  key={`l-${lIdx}`}
                  d={`M ${xLeft} ${yTop} L ${xLeft} ${yBottom} L ${xRight} ${yBottom}`}
                  stroke="#94a3b8"
                  strokeWidth={0.85}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
        );
      })}

      {/* Central Blue Cable (خط الكيبل الأساسي باللون الأزرق المعتمد) */}
      {showCable && (
        <line
          x1={0}
          y1={0}
          x2={length}
          y2={0}
          stroke={cableColor}
          strokeWidth={cableWidth}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

export const CadCanvas: React.FC<CadCanvasProps> = ({
  elements,
  setElements,
  activeTool,
  setActiveTool,
  orthoMode,
  snapToGrid,
  showGrid,
  selectedElementId,
  setSelectedElementId,
  customTools,
  onElementsChange,
  width = 750,
  height = 700,
  onAutoCalculateLengths,
  onDoubleClickElement,
  presetCableLength = null,
  onEditSymbolName,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [currentMouse, setCurrentMouse] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Rock-solid dragging refs (prevent accumulation drift)
  const dragStartMouseRef = useRef<Point>({ x: 0, y: 0 });
  const dragInitialElementRef = useRef<CanvasElement | null>(null);
  const dragConnectedSymbolsRef = useRef<
    { id: string; initialX: number; initialY: number }[]
  >([]);

  // Direct on-canvas inline length input state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLineText, setEditingLineText] = useState<string>('');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabelText, setTempLabelText] = useState<string>('');

  // Symbol Name or Number inline editing state (بجوار كل رمز إمكانية التحرير لإضافة اسم أو رقم)
  const [editingSymbolId, setEditingSymbolId] = useState<string | null>(null);
  const [editingSymbolText, setEditingSymbolText] = useState<string>('');

  const handleCommitSymbolText = (id: string, text: string) => {
    const trimmed = text.trim();
    const updated = elements.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          label: trimmed,
          text: trimmed,
          symbolName: trimmed,
        };
      }
      return item;
    });
    setElements(updated);
    onElementsChange?.(updated);
    setEditingSymbolId(null);
  };

  const handleCycleLabelPosition = (id: string) => {
    const positions: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
    const updated = elements.map((item) => {
      if (item.id === id) {
        const current = (item.labelPosition as 'top' | 'right' | 'bottom' | 'left') || 'bottom';
        const currentIndex = positions.indexOf(current);
        const nextPos = positions[(currentIndex + 1) % positions.length];
        return {
          ...item,
          labelPosition: nextPos,
        };
      }
      return item;
    });
    setElements(updated);
    onElementsChange?.(updated);
  };

  // Subscription meter inline number editing state
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubField, setEditingSubField] = useState<'top' | 'bottom' | null>(null);
  const [editingSubValue, setEditingSubValue] = useState<string>('');

  const handleSaveSubNumber = (id: string, field: 'top' | 'bottom', val: string) => {
    const trimmed = val.trim();
    const updated = elements.map((item) => {
      if (item.id === id) {
        const top = field === 'top' ? trimmed : (item.subscriptionTop || '2658');
        const bottom = field === 'bottom' ? trimmed : (item.subscriptionBottom || '3853');
        return {
          ...item,
          subscriptionTop: top,
          subscriptionBottom: bottom,
          label: `${top}/${bottom}`,
        };
      }
      return item;
    });
    setElements(updated);
    onElementsChange?.(updated);
    setEditingSubId(null);
    setEditingSubField(null);
  };

  // Grip stretching states (AutoCAD vertex grips & textbox resizing)
  const [activeGrip, setActiveGrip] = useState<'start' | 'end' | 'resize-textbox' | null>(null);
  const [gripElementId, setGripElementId] = useState<string | null>(null);
  const [liveGripLength, setLiveGripLength] = useState<number | null>(null);
  const [liveGripCoord, setLiveGripCoord] = useState<Point | null>(null);
  const [initialSymbolPositions, setInitialSymbolPositions] = useState<
    { id: string; x: number; y: number }[]
  >([]);

  // Direct line length change on the drawing
  const handleDirectLineLengthChange = (
    lineId: string,
    targetMeters: number,
    soilType?: SoilType
  ) => {
    const updated = resizeLineElement(elements, lineId, targetMeters, {
      anchor: 'start',
      updateLabel: true,
      moveConnectedSymbols: true,
    });
    setElements(updated);
    onElementsChange?.(updated);
    // Trench and soil lengths in header are preserved and edited manually
  };

  const handleCommitLineLength = (
    lineId: string,
    rawText: string,
    soilType?: SoilType
  ) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const matchNumber = trimmed.match(/(\d+(\.\d+)?)/);
    const parsedMeters = matchNumber ? parseFloat(matchNumber[1]) : null;

    let detectedSoil: SoilType | undefined = soilType;
    const upper = trimmed.toUpperCase();
    if (upper.includes('AS')) detectedSoil = 'AS';
    else if (upper.includes('NG')) detectedSoil = 'NG';
    else if (upper.includes('T')) detectedSoil = 'T';

    if (parsedMeters && parsedMeters > 0) {
      const updated = elements.map((item) => {
        if (item.id === lineId) {
          const resized = resizeLineElement([item], lineId, parsedMeters, {
            anchor: 'start',
            updateLabel: false,
            moveConnectedSymbols: true,
          })[0];
          return {
            ...resized,
            soilType: detectedSoil || item.soilType,
            label: formatLineLabel(parsedMeters, detectedSoil || item.soilType),
          };
        }
        return item;
      });
      setElements(updated);
      onElementsChange?.(updated);
      // Trench and soil lengths in header are preserved and edited manually
    }
  };

  const snapCoord = (val: number, step = 10): number => {
    return snapToGrid ? Math.round(val / step) * step : val;
  };

  const getCanvasCoords = (e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      x: snapCoord(rawX),
      y: snapCoord(rawY),
    };
  };

  const applyOrtho = (start: Point, current: Point): Point => {
    if (!orthoMode) return current;
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    if (dx >= dy) {
      return { x: current.x, y: start.y };
    } else {
      return { x: start.x, y: current.y };
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (editingLabelId) {
      setEditingLabelId(null);
    }
    const coords = getCanvasCoords(e);

    // If in select mode
    if (activeTool === 'select') {
      const target = e.target as SVGElement;
      if (target.closest && target.closest('[data-no-drag="true"]')) {
        return;
      }
      const gripType = target.getAttribute('data-grip-type') as 'start' | 'end' | 'resize-textbox' | null;
      const gripElemId = target.getAttribute('data-grip-element-id');

      if (gripType && gripElemId) {
        setActiveGrip(gripType);
        setGripElementId(gripElemId);
        setSelectedElementId(gripElemId);

        if (gripType === 'start' || gripType === 'end') {
          // Record any connected symbols at this endpoint (e.g. SP or Substation)
          const targetLine = elements.find((x) => x.id === gripElemId);
          if (targetLine) {
            const gripPoint =
              gripType === 'start'
                ? { x: targetLine.x, y: targetLine.y }
                : { x: targetLine.x2 ?? targetLine.x, y: targetLine.y2 ?? targetLine.y };

            const connected = elements
              .filter(
                (item) =>
                  item.id !== gripElemId &&
                  (item.type === 'symbol' || item.type === 'custom_symbol') &&
                  Math.hypot(item.x - gripPoint.x, item.y - gripPoint.y) <= 26
              )
              .map((item) => ({ id: item.id, x: item.x, y: item.y }));

            setInitialSymbolPositions(connected);
          }
        }
        return;
      }

      const elementId = target.getAttribute('data-element-id');
      if (elementId) {
        setSelectedElementId(elementId);
        const el = elements.find((x) => x.id === elementId);
        if (el) {
          setIsDragging(true);
          dragStartMouseRef.current = coords;
          dragInitialElementRef.current = { ...el };

          // If line or dimension, also record connected symbols at either endpoint
          if (el.type === 'line' || el.type === 'dimension') {
            const p1 = { x: el.x, y: el.y };
            const p2 = { x: el.x2 ?? el.x, y: el.y2 ?? el.y };
            const connected = elements
              .filter(
                (item) =>
                  item.id !== el.id &&
                  (item.type === 'symbol' || item.type === 'custom_symbol') &&
                  (Math.hypot(item.x - p1.x, item.y - p1.y) <= 28 ||
                    Math.hypot(item.x - p2.x, item.y - p2.y) <= 28)
              )
              .map((item) => ({ id: item.id, initialX: item.x, initialY: item.y }));
            dragConnectedSymbolsRef.current = connected;
          } else {
            dragConnectedSymbolsRef.current = [];
          }
        }
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    // Direct symbol insertion tools (SP, Substation, Joint, North, Pinned Tools)
    if (activeTool === 'sp') {
      const newEl: CanvasElement = {
        id: `sp-${Date.now()}`,
        type: 'symbol',
        symbolKind: 'sp',
        x: coords.x,
        y: coords.y,
        width: 26,
        height: 26,
        strokeColor: '#0022cc',
        strokeWidth: 2,
        label: 'SP',
        labelPosition: 'top',
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'substation') {
      const newEl: CanvasElement = {
        id: `substation-${Date.now()}`,
        type: 'symbol',
        symbolKind: 'substation',
        x: coords.x,
        y: coords.y,
        width: 44,
        height: 24,
        strokeColor: '#000000',
        strokeWidth: 1.5,
        label: 'محطة 973018',
        labelPosition: 'bottom',
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'cabinet' || activeTool === 'substation_cross') {
      const newEl: CanvasElement = {
        id: `cabinet-${Date.now()}`,
        type: 'symbol',
        symbolKind: 'cabinet',
        x: coords.x,
        y: coords.y,
        width: 44,
        height: 24,
        strokeColor: '#000000',
        strokeWidth: 1.5,
        label: 'كابينة C973018/5',
        labelPosition: 'bottom',
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'textbox') {
      const newEl: CanvasElement = {
        id: `textbox-${Date.now()}`,
        type: 'textbox',
        x: coords.x,
        y: coords.y,
        width: 140,
        height: 52,
        strokeColor: '#334155',
        strokeWidth: 1.5,
        fillColor: '#ffffff',
        text: 'مربع نصي',
        fontSize: 12,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setEditingLabelId(newEl.id);
      setTempLabelText(newEl.text || 'مربع نصي');
      setActiveTool('select');
      return;
    }

    if (activeTool === 'joint') {
      const newEl: CanvasElement = {
        id: `joint-${Date.now()}`,
        type: 'symbol',
        symbolKind: 'joint',
        x: coords.x,
        y: coords.y,
        width: 20,
        height: 20,
        strokeColor: '#dc2626',
        strokeWidth: 2,
        label: 'لحام 70',
        labelPosition: 'bottom',
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'subscription') {
      const newEl: CanvasElement = {
        id: `subscription-${Date.now()}`,
        type: 'symbol',
        symbolKind: 'subscription',
        x: coords.x,
        y: coords.y,
        width: 18,
        height: 26,
        strokeColor: '#0022cc',
        strokeWidth: 1.6,
        subscriptionTop: '2658',
        subscriptionBottom: '3853',
        label: '2658/3853',
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'north') {
      const newEl: CanvasElement = {
        id: `north-${Date.now()}`,
        type: 'symbol',
        symbolKind: 'north_arrow',
        x: coords.x,
        y: coords.y,
        width: 36,
        height: 48,
        strokeColor: '#000000',
        strokeWidth: 2,
        label: 'N',
        labelPosition: 'bottom',
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'text') {
      const newEl: CanvasElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: coords.x,
        y: coords.y,
        text: 'شارع عرض 15م',
        strokeColor: '#1e293b',
        strokeWidth: 1,
        fontSize: 13,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setEditingLabelId(newEl.id);
      setTempLabelText(newEl.text || '');
      setActiveTool('select');
      return;
    }

    // Check if tool is custom tool
    const customTool = customTools.find((t) => t.id === activeTool);
    if (customTool) {
      const newEl: CanvasElement = {
        id: `custom-${Date.now()}`,
        type: 'custom_symbol',
        symbolKind: customTool.symbolKind,
        x: coords.x,
        y: coords.y,
        width: 30,
        height: 30,
        strokeColor: customTool.color,
        strokeWidth: 2,
        fillColor: customTool.color,
        label: customTool.defaultLabel,
        text: customTool.name,
        customToolId: customTool.id,
      };
      const updated = [...elements, newEl];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newEl.id);
      setActiveTool('select');
      return;
    }

    // Geometry tools with drag: line, cable_as, cable_ng, cable_t, rect, circle, dimension
    setDrawingStart(coords);
    setCurrentMouse(coords);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rawCoords = getCanvasCoords(e);

    // If dragging a line endpoint grip (lengthening / stretching line)
    if (activeGrip && gripElementId) {
      const targetLine = elements.find((x) => x.id === gripElementId);
      if (
        targetLine &&
        targetLine.x2 !== undefined &&
        targetLine.y2 !== undefined
      ) {
        const fixedPoint =
          activeGrip === 'start'
            ? { x: targetLine.x2, y: targetLine.y2 }
            : { x: targetLine.x, y: targetLine.y };

        const movedPoint = applyOrtho(fixedPoint, rawCoords);
        const newDistPixels = Math.hypot(
          movedPoint.x - fixedPoint.x,
          movedPoint.y - fixedPoint.y
        );
        const newDistMeters = Math.max(0.5, newDistPixels / PIXELS_PER_METER);

        setLiveGripLength(newDistMeters);
        setLiveGripCoord(movedPoint);

        const prevMovingX = activeGrip === 'start' ? targetLine.x : targetLine.x2;
        const prevMovingY = activeGrip === 'start' ? targetLine.y : targetLine.y2;
        const dx = movedPoint.x - prevMovingX;
        const dy = movedPoint.y - prevMovingY;

        const updated = elements.map((item) => {
          if (item.id === gripElementId) {
            return {
              ...item,
              x: activeGrip === 'start' ? movedPoint.x : item.x,
              y: activeGrip === 'start' ? movedPoint.y : item.y,
              x2: activeGrip === 'end' ? movedPoint.x : item.x2,
              y2: activeGrip === 'end' ? movedPoint.y : item.y2,
              label: formatLineLabel(
                newDistMeters,
                item.soilType,
                getLineLengthInfo(item)?.prefix
              ),
            };
          }

          // Shift connected symbols (e.g. SP point, substation box) along with moving endpoint
          const connectedInitial = initialSymbolPositions.find(
            (s) => s.id === item.id
          );
          if (connectedInitial) {
            return {
              ...item,
              x: connectedInitial.x + dx,
              y: connectedInitial.y + dy,
            };
          }

          return item;
        });

        setElements(updated);
      }
      return;
    }

    // If resizing a textbox via bottom-right grip
    if (activeGrip === 'resize-textbox' && gripElementId) {
      const target = elements.find((x) => x.id === gripElementId);
      if (target) {
        const newW = Math.max(50, rawCoords.x - target.x);
        const newH = Math.max(26, rawCoords.y - target.y);
        const updated = elements.map((item) =>
          item.id === gripElementId ? { ...item, width: newW, height: newH } : item
        );
        setElements(updated);
      }
      return;
    }

    // If dragging an element in select mode
    if (isDragging && selectedElementId && dragInitialElementRef.current) {
      const initEl = dragInitialElementRef.current;
      const dx = rawCoords.x - dragStartMouseRef.current.x;
      const dy = rawCoords.y - dragStartMouseRef.current.y;

      const snappedDx = snapCoord(dx);
      const snappedDy = snapCoord(dy);

      const updated = elements.map((item) => {
        if (item.id === selectedElementId) {
          return {
            ...item,
            x: snapCoord(initEl.x + snappedDx),
            y: snapCoord(initEl.y + snappedDy),
            x2:
              initEl.x2 !== undefined
                ? snapCoord(initEl.x2 + snappedDx)
                : undefined,
            y2:
              initEl.y2 !== undefined
                ? snapCoord(initEl.y2 + snappedDy)
                : undefined,
          };
        }
        // Also move connected symbols if attached
        const conn = dragConnectedSymbolsRef.current.find(
          (c) => c.id === item.id
        );
        if (conn) {
          return {
            ...item,
            x: snapCoord(conn.initialX + snappedDx),
            y: snapCoord(conn.initialY + snappedDy),
          };
        }
        return item;
      });
      setElements(updated);
      return;
    }

    if (!drawingStart) return;

    let orthoPoint = applyOrtho(drawingStart, rawCoords);
    if (
      presetCableLength &&
      presetCableLength > 0 &&
      ['cable_as', 'cable_ng', 'cable_t', 'cable_kasht', 'line'].includes(activeTool)
    ) {
      const dx = orthoPoint.x - drawingStart.x;
      const dy = orthoPoint.y - drawingStart.y;
      const angle = Math.atan2(dy, dx);
      const targetPixels = presetCableLength * PIXELS_PER_METER;
      orthoPoint = {
        x: drawingStart.x + Math.cos(angle) * targetPixels,
        y: drawingStart.y + Math.sin(angle) * targetPixels,
      };
    }
    setCurrentMouse(orthoPoint);
  };

  const handleMouseUp = () => {
    if (activeGrip && gripElementId) {
      setActiveGrip(null);
      setGripElementId(null);
      setLiveGripLength(null);
      setLiveGripCoord(null);
      setInitialSymbolPositions([]);
      onElementsChange?.(elements);
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      dragInitialElementRef.current = null;
      dragConnectedSymbolsRef.current = [];
      onElementsChange?.(elements);
      return;
    }

    if (!drawingStart || !currentMouse) {
      setDrawingStart(null);
      setCurrentMouse(null);
      return;
    }

    const dist = Math.hypot(
      currentMouse.x - drawingStart.x,
      currentMouse.y - drawingStart.y
    );

    // If just clicked without dragging
    if (dist < 4) {
      setDrawingStart(null);
      setCurrentMouse(null);
      return;
    }

    const meters = (dist / PIXELS_PER_METER).toFixed(2);
    let newElement: CanvasElement | null = null;

    if (activeTool === 'cable_as') {
      newElement = {
        id: `cable-as-${Date.now()}`,
        type: 'line',
        x: drawingStart.x,
        y: drawingStart.y,
        x2: currentMouse.x,
        y2: currentMouse.y,
        strokeColor: '#0022cc',
        strokeWidth: 2.5,
        soilType: 'AS',
        label: `AS ${parseFloat(meters)}M`,
        labelPosition:
          Math.abs(currentMouse.x - drawingStart.x) >
          Math.abs(currentMouse.y - drawingStart.y)
            ? 'top'
            : 'left',
      };
    } else if (activeTool === 'cable_ng') {
      newElement = {
        id: `cable-ng-${Date.now()}`,
        type: 'line',
        x: drawingStart.x,
        y: drawingStart.y,
        x2: currentMouse.x,
        y2: currentMouse.y,
        strokeColor: '#0022cc', // standard SEC cable blue with NG tag
        strokeWidth: 2.5,
        soilType: 'NG',
        label: `NG${parseFloat(meters)}M`,
        labelPosition: 'left',
      };
    } else if (activeTool === 'cable_t') {
      newElement = {
        id: `cable-t-${Date.now()}`,
        type: 'line',
        x: drawingStart.x,
        y: drawingStart.y,
        x2: currentMouse.x,
        y2: currentMouse.y,
        strokeColor: '#059669',
        strokeWidth: 2.5,
        soilType: 'T',
        label: `T ${parseFloat(meters)}M`,
        labelPosition: 'top',
      };
    } else if (activeTool === 'cable_kasht') {
      newElement = {
        id: `cable-kasht-${Date.now()}`,
        type: 'line',
        x: drawingStart.x,
        y: drawingStart.y,
        x2: currentMouse.x,
        y2: currentMouse.y,
        strokeColor: '#0022cc',
        strokeWidth: 2.8,
        soilType: 'KASHT',
        isMilling: true,
        label: `كشط ${parseFloat(meters)}M`,
        labelPosition: 'left',
        labelSide: 'left',
      };
    } else if (activeTool === 'line') {
      newElement = {
        id: `line-${Date.now()}`,
        type: 'line',
        x: drawingStart.x,
        y: drawingStart.y,
        x2: currentMouse.x,
        y2: currentMouse.y,
        strokeColor: '#334155',
        strokeWidth: 2,
        label: `${parseFloat(meters)}M`,
        labelPosition: 'top',
      };
    } else if (activeTool === 'dimension') {
      newElement = {
        id: `dim-${Date.now()}`,
        type: 'dimension',
        x: drawingStart.x,
        y: drawingStart.y,
        x2: currentMouse.x,
        y2: currentMouse.y,
        strokeColor: '#dc2626',
        strokeWidth: 1.5,
        label: `${parseFloat(meters)}M`,
        labelPosition: 'top',
      };
    } else if (activeTool === 'rect') {
      const rx = Math.min(drawingStart.x, currentMouse.x);
      const ry = Math.min(drawingStart.y, currentMouse.y);
      const rw = Math.abs(currentMouse.x - drawingStart.x);
      const rh = Math.abs(currentMouse.y - drawingStart.y);
      newElement = {
        id: `rect-${Date.now()}`,
        type: 'rect',
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        strokeColor: '#0f172a',
        strokeWidth: 2,
        fillColor: 'transparent',
      };
    } else if (activeTool === 'light_rect') {
      const rx = Math.min(drawingStart.x, currentMouse.x);
      const ry = Math.min(drawingStart.y, currentMouse.y);
      const rw = Math.abs(currentMouse.x - drawingStart.x);
      const rh = Math.abs(currentMouse.y - drawingStart.y);
      newElement = {
        id: `light-rect-${Date.now()}`,
        type: 'rect',
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        strokeColor: '#94a3b8',
        strokeWidth: 1.2,
        strokeStyle: 'solid',
        fillColor: 'transparent',
        isLight: true,
      };
    } else if (activeTool === 'circle') {
      const radius = Math.hypot(
        currentMouse.x - drawingStart.x,
        currentMouse.y - drawingStart.y
      );
      newElement = {
        id: `circle-${Date.now()}`,
        type: 'circle',
        x: drawingStart.x,
        y: drawingStart.y,
        width: radius * 2,
        height: radius * 2,
        strokeColor: '#0f172a',
        strokeWidth: 2,
        fillColor: 'transparent',
      };
    }

    if (newElement) {
      const updated = [...elements, newElement];
      setElements(updated);
      onElementsChange?.(updated);
      setSelectedElementId(newElement.id);
    }

    setDrawingStart(null);
    setCurrentMouse(null);
    setActiveTool('select');
  };

  const handleDoubleClick = (el: CanvasElement) => {
    setSelectedElementId(el.id);
    if (onDoubleClickElement) {
      onDoubleClickElement(el);
    } else {
      setEditingLabelId(el.id);
      setTempLabelText(el.label || el.text || '');
    }
  };

  const handleSvgDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const elementId = target.getAttribute('data-element-id');
    if (elementId) {
      const el = elements.find((x) => x.id === elementId);
      if (el) {
        handleDoubleClick(el);
        return;
      }
    }
    const coords = getCanvasCoords(e);
    // Find closest element
    for (const el of [...elements].reverse()) {
      if (el.type === 'line' || el.type === 'dimension') {
        const p1 = { x: el.x, y: el.y };
        const p2 = { x: el.x2 ?? el.x, y: el.y2 ?? el.y };
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthSq = dx * dx + dy * dy;
        let t = lengthSq === 0 ? 0 : ((coords.x - p1.x) * dx + (coords.y - p1.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const dist = Math.hypot(coords.x - projX, coords.y - projY);
        if (dist <= 22) {
          handleDoubleClick(el);
          return;
        }
      } else {
        const w = el.width || 36;
        const h = el.height || 36;
        if (
          coords.x >= el.x - w / 2 - 12 &&
          coords.x <= el.x + w / 2 + 12 &&
          coords.y >= el.y - h / 2 - 12 &&
          coords.y <= el.y + h / 2 + 12
        ) {
          handleDoubleClick(el);
          return;
        }
      }
    }
  };

  const handleSaveLabel = (id: string) => {
    const updated = elements.map((item) => {
      if (item.id === id) {
        if (item.type === 'text') {
          return { ...item, text: tempLabelText };
        } else {
          return { ...item, label: tempLabelText };
        }
      }
      return item;
    });
    setElements(updated);
    onElementsChange?.(updated);
    setEditingLabelId(null);
  };

  // Helper to render editable name or number label and quick controls beside every symbol
  const renderSymbolLabelAndControls = (
    el: CanvasElement,
    defaultLabel: string,
    defaultPos: 'top' | 'bottom' | 'left' | 'right',
    symbolWidth: number,
    symbolHeight: number,
    accentColor: string
  ) => {
    const isSelected = el.id === selectedElementId;
    const currentLabel = el.label !== undefined && el.label !== '' ? el.label : defaultLabel;
    const pos = (el.labelPosition as 'top' | 'bottom' | 'left' | 'right') || defaultPos;

    let lx = el.x;
    let ly = el.y;
    let textAnchor: 'middle' | 'start' | 'end' = 'middle';

    if (pos === 'top') {
      lx = el.x;
      ly = el.y - symbolHeight / 2 - 14;
      textAnchor = 'middle';
    } else if (pos === 'bottom') {
      lx = el.x;
      ly = el.y + symbolHeight / 2 + 18;
      textAnchor = 'middle';
    } else if (pos === 'right') {
      lx = el.x + symbolWidth / 2 + 12;
      ly = el.y + 4;
      textAnchor = 'start';
    } else if (pos === 'left') {
      lx = el.x - symbolWidth / 2 - 12;
      ly = el.y + 4;
      textAnchor = 'end';
    }

    // Calculate background badge dimensions
    const textLen = currentLabel.length;
    const badgeW = Math.max(38, textLen * 7.5 + 24);
    const badgeH = 22;
    const badgeX = textAnchor === 'middle' ? lx - badgeW / 2 : textAnchor === 'start' ? lx - 4 : lx - badgeW + 4;
    const badgeY = ly - 15;

    return (
      <g key={`symbol-label-${el.id}`} data-no-drag="true">
        {/* The Label Display & Click to Edit */}
        <g
          className="cursor-pointer select-none group"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedElementId(el.id);
            if (onEditSymbolName) {
              onEditSymbolName(el);
            } else {
              handleDoubleClick(el);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (onEditSymbolName) {
              onEditSymbolName(el);
            } else {
              handleDoubleClick(el);
            }
          }}
        >
          {/* Crisp background badge so text is 100% readable over cables and lines */}
          <rect
            x={badgeX}
            y={badgeY}
            width={badgeW}
            height={badgeH}
            rx={5}
            fill="#ffffff"
            stroke={isSelected ? '#f59e0b' : '#cbd5e1'}
            strokeWidth={isSelected ? 2 : 1}
            className="group-hover:stroke-amber-500 transition-all"
            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))"
          />

          {/* Pencil Icon indicator */}
          <g transform={`translate(${textAnchor === 'start' ? badgeX + badgeW - 16 : badgeX + 4}, ${badgeY + 5})`} className="opacity-70 group-hover:opacity-100 transition-opacity">
            <path
              d="M1 9.5 L7.5 3 L9 4.5 L2.5 11 L1 11 Z M7 2.5 L8.5 1 L10 2.5 L8.5 4 Z"
              fill="#f59e0b"
            />
          </g>

          {/* Label Text */}
          <text
            x={textAnchor === 'middle' ? lx + 6 : textAnchor === 'start' ? lx + 4 : lx - 8}
            y={ly}
            textAnchor={textAnchor}
            fill={accentColor || '#0f172a'}
            className="font-bold text-[12px] select-none font-['Cairo',sans-serif] group-hover:fill-amber-600 transition-colors"
          >
            <title>انقر هنا لتحرير اسم أو رقم هذا الرمز وموضعه فوراً</title>
            {currentLabel}
          </text>
        </g>

        {/* Floating Quick Action toolbar when this symbol is selected */}
        {isSelected && (
          <foreignObject
            x={el.x - 75}
            y={el.y - symbolHeight / 2 - 42}
            width={150}
            height={32}
            className="overflow-visible pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 bg-slate-950 text-white px-2.5 py-1 rounded-full shadow-2xl border border-amber-500/50 text-[11px] font-bold">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditSymbolName) {
                    onEditSymbolName(el);
                  } else {
                    handleDoubleClick(el);
                  }
                }}
                className="flex items-center gap-1 hover:text-amber-400 px-1 py-0.5 rounded transition-colors text-amber-300"
                title="تعديل اسم أو رقم الرمز"
              >
                <span>✏️</span>
                <span>اسم/رقم</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCycleLabelPosition(el.id);
                }}
                className="hover:text-blue-400 px-1 py-0.5 rounded font-mono text-[9px] text-slate-300"
                title="تبديل موضع الاسم بجوار الرمز (أعلى / يمين / أسفل / يسار)"
              >
                <span>{pos === 'top' ? '⬆ أعلى' : pos === 'bottom' ? '⬇ أسفل' : pos === 'right' ? '➔ يمين' : '⬅ يسار'}</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const updated = elements.filter((x) => x.id !== el.id);
                  setElements(updated);
                  onElementsChange?.(updated);
                  setSelectedElementId(null);
                }}
                className="text-rose-400 hover:text-rose-300 px-1 hover:bg-rose-950/40 rounded"
                title="حذف الرمز"
              >
                ✕
              </button>
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white overflow-hidden select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full touch-none"
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleSvgDoubleClick}
      >
        <defs>
          {/* Dimension arrow markers */}
          <marker
            id="arrow-start"
            viewBox="0 0 10 10"
            refX="0"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#dc2626" />
          </marker>
          <marker
            id="arrow-end"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
          </marker>

          {/* Grid pattern */}
          {showGrid && (
            <pattern
              id="cad-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="0.8" fill="#cbd5e1" />
            </pattern>
          )}

          {/* SP Radial Glow gradient matching image */}
          <radialGradient id="spGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#84cc16" />
            <stop offset="90%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>

        {/* Background & Grid */}
        <rect width={width} height={height} fill="#ffffff" />
        {showGrid && (
          <rect width={width} height={height} fill="url(#cad-grid)" />
        )}

        {/* Render Saved Elements */}
        {elements.map((el) => {
          const isSelected = el.id === selectedElementId;

          // Lines and Cables
          if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
            const dx = el.x2 - el.x;
            const dy = el.y2 - el.y;
            const lineDist = Math.hypot(dx, dy) || 1;
            const midX = (el.x + el.x2) / 2;
            const midY = (el.y + el.y2) / 2;

            // Calculate rotation angle parallel to the line
            let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            let textAngle = rawAngle;
            if (textAngle > 90) textAngle -= 180;
            if (textAngle < -90) textAngle += 180;

            // Perpendicular unit vector pointing to side of cable
            const nx = -dy / lineDist;
            const ny = dx / lineDist;

            // Side offset: offset text perpendicular to line so it is cleanly beside cable
            const isMilling = el.isMilling || el.soilType === 'KASHT';
            const sideSign = el.labelSide === 'right' ? -1 : 1;
            const offsetDist = (isMilling ? 26 : 14) * sideSign;
            const labelX = midX + nx * offsetDist;
            const labelY = midY + ny * offsetDist;

            const lengthInfo = getLineLengthInfo(el);
            const displayMeters = lengthInfo ? lengthInfo.lengthMeters : 0;
            const defaultLabel = `${el.soilType && el.soilType !== 'NONE' ? (el.soilType === 'KASHT' ? 'كشط ' : el.soilType) : ''}${displayMeters}M`;
            const labelText = el.label !== undefined ? el.label : defaultLabel;
            const isEditing = editingLineId === el.id;

            return (
              <g
                key={el.id}
                data-element-id={el.id}
                className="group cursor-move"
                style={{ cursor: isDragging && isSelected ? 'grabbing' : 'grab' }}
              >
                {/* Thick invisible click boundary for effortless line moving */}
                <line
                  x1={el.x}
                  y1={el.y}
                  x2={el.x2}
                  y2={el.y2}
                  stroke="transparent"
                  strokeWidth={isMilling ? 38 : 20}
                  data-element-id={el.id}
                  className="cursor-move"
                />
                {/* Selection outline */}
                {isSelected && (
                  <line
                    x1={el.x}
                    y1={el.y}
                    x2={el.x2}
                    y2={el.y2}
                    stroke="#2563eb"
                    strokeWidth={isMilling ? 38 : el.strokeWidth + 5}
                    strokeOpacity={0.25}
                    strokeLinecap="round"
                  />
                )}
                {/* Visible Line or Milling Corridor (نمط الكشط كما في صورة 5584) */}
                {isMilling ? (
                  <MillingCorridor
                    x1={el.x}
                    y1={el.y}
                    x2={el.x2}
                    y2={el.y2}
                    cableColor={el.strokeColor || '#0022cc'}
                    cableWidth={el.strokeWidth || 2.8}
                    showCable={true}
                  />
                ) : (
                  <line
                    x1={el.x}
                    y1={el.y}
                    x2={el.x2}
                    y2={el.y2}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    data-element-id={el.id}
                    strokeLinecap="round"
                    strokeDasharray={el.strokeStyle === 'dashed' ? '6 3' : 'none'}
                    className="cursor-move"
                  />
                )}

                {/* Direct On-Canvas Length Text aligned BESIDE the Cable matching IMG_5583 */}
                {labelText && !isEditing && (
                  <g
                    transform={`translate(${labelX}, ${labelY}) rotate(${textAngle})`}
                    className="cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                      setEditingLineId(el.id);
                      setEditingLineText(labelText);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                      setEditingLineId(el.id);
                      setEditingLineText(labelText);
                    }}
                  >
                    {/* Subtle text halo/backdrop so it remains crisp over grid or lines */}
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      stroke="#ffffff"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      className="font-mono font-bold text-[12px] select-none"
                    >
                      {labelText}
                    </text>
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={el.soilType === 'NG' ? '#854d0e' : el.soilType === 'T' ? '#065f46' : '#000000'}
                      className="font-mono font-bold text-[12px] select-none tracking-tight hover:fill-blue-600 transition-colors"
                      data-element-id={el.id}
                    >
                      <title>انقر لكتابة وتعديل الطول أو نوع التربة مباشرة</title>
                      {labelText}
                    </text>
                  </g>
                )}

                {/* Direct On-Canvas Inline Editable Input when clicked or editing */}
                {isEditing && (
                  <foreignObject
                    transform={`translate(${labelX}, ${labelY})`}
                    x={-56}
                    y={-14}
                    width={112}
                    height={28}
                    className="overflow-visible pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded shadow-lg border bg-white border-blue-600 ring-2 ring-blue-500/25">
                        <input
                          type="text"
                          autoFocus
                          value={editingLineText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingLineText(val);
                            const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
                            if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
                              handleDirectLineLengthChange(el.id, parsed, el.soilType);
                            }
                          }}
                          onBlur={() => {
                            handleCommitLineLength(el.id, editingLineText, el.soilType);
                            setEditingLineId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCommitLineLength(el.id, editingLineText, el.soilType);
                              setEditingLineId(null);
                            } else if (e.key === 'Escape') {
                              setEditingLineId(null);
                            }
                          }}
                          className="w-16 text-center font-bold font-mono text-[11px] text-blue-900 bg-transparent border-0 outline-none p-0 select-text"
                          placeholder="مثال AS6.0M"
                          title="اكتب الطول مباشرة (مثال: 6 أو AS6.0M أو NG15M)"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleCommitLineLength(el.id, editingLineText, el.soilType);
                            setEditingLineId(null);
                          }}
                          className="p-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          title="حفظ"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </foreignObject>
                )}

                {/* When line is selected, show side-flipper button */}
                {isSelected && !isEditing && (
                  <foreignObject
                    transform={`translate(${midX}, ${midY})`}
                    x={-20}
                    y={-10}
                    width={40}
                    height={20}
                    className="overflow-visible pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated: CanvasElement[] = elements.map((item) =>
                            item.id === el.id
                              ? {
                                  ...item,
                                  labelSide: (item.labelSide === 'right' ? 'left' : 'right') as 'left' | 'right',
                                }
                              : item
                          );
                          setElements(updated);
                          onElementsChange?.(updated);
                        }}
                        className="px-1 py-0.5 text-[9px] font-bold bg-slate-800 text-white rounded hover:bg-slate-700 shadow-sm border border-slate-600"
                        title="تبديل جهة النص (يمين/يسار الكيبل)"
                      >
                        ⇄ جهة
                      </button>
                    </div>
                  </foreignObject>
                )}

                {/* Interactive AutoCAD Grips for stretching / lengthening */}
                {isSelected && (
                  <>
                    {/* Grip 1: Start Point (x, y) */}
                    <g className="cursor-crosshair">
                      <circle
                        cx={el.x}
                        cy={el.y}
                        r={13}
                        fill="transparent"
                        data-grip-type="start"
                        data-grip-element-id={el.id}
                      />
                      <rect
                        x={el.x - 5}
                        y={el.y - 5}
                        width={10}
                        height={10}
                        rx={2}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Grip 2: End Point (x2, y2) */}
                    <g className="cursor-crosshair">
                      <circle
                        cx={el.x2}
                        cy={el.y2}
                        r={13}
                        fill="transparent"
                        data-grip-type="end"
                        data-grip-element-id={el.id}
                      />
                      <rect
                        x={el.x2 - 5}
                        y={el.y2 - 5}
                        width={10}
                        height={10}
                        rx={2}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Midpoint handle for moving line */}
                    <g className="cursor-move">
                      <circle
                        cx={midX}
                        cy={midY}
                        r={16}
                        fill="transparent"
                        data-element-id={el.id}
                      />
                    </g>
                  </>
                )}
              </g>
            );
          }

          // Dimension Line with Arrows
          if (
            el.type === 'dimension' &&
            el.x2 !== undefined &&
            el.y2 !== undefined
          ) {
            const midX = (el.x + el.x2) / 2;
            const midY = (el.y + el.y2) / 2;
            const lengthInfo = getLineLengthInfo(el);
            const displayMeters = lengthInfo ? lengthInfo.lengthMeters : 0;

            return (
              <g
                key={el.id}
                data-element-id={el.id}
                className="cursor-move"
                style={{ cursor: isDragging && isSelected ? 'grabbing' : 'grab' }}
              >
                {/* Thick invisible click boundary for moving dimension */}
                <line
                  x1={el.x}
                  y1={el.y}
                  x2={el.x2}
                  y2={el.y2}
                  stroke="transparent"
                  strokeWidth={20}
                  data-element-id={el.id}
                  className="cursor-move"
                />
                <line
                  x1={el.x}
                  y1={el.y}
                  x2={el.x2}
                  y2={el.y2}
                  stroke={el.strokeColor}
                  strokeWidth={el.strokeWidth}
                  markerStart="url(#arrow-start)"
                  markerEnd="url(#arrow-end)"
                  data-element-id={el.id}
                  className="cursor-move"
                />

                {/* Direct On-Canvas Editable Length Badge right on the dimension line */}
                <foreignObject
                  x={midX - 45}
                  y={midY - 12}
                  width={90}
                  height={24}
                  className="overflow-visible pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <div
                      className={`flex items-center gap-0.5 px-1 py-0.5 rounded shadow-xs border transition-all ${
                        isSelected || editingLineId === el.id
                          ? 'bg-white border-red-600 ring-2 ring-red-500/20'
                          : 'bg-white/95 hover:bg-white border-red-300'
                      }`}
                    >
                      <input
                        type="text"
                        value={
                          editingLineId === el.id
                            ? editingLineText
                            : (el.label || `${displayMeters}M`)
                        }
                        onFocus={() => {
                          setSelectedElementId(el.id);
                          setEditingLineId(el.id);
                          setEditingLineText(`${displayMeters}`);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingLineId(el.id);
                          setEditingLineText(val);
                          const parsed = parseFloat(val);
                          if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
                            handleDirectLineLengthChange(el.id, parsed);
                          }
                        }}
                        onBlur={() => {
                          if (editingLineId === el.id) {
                            handleCommitLineLength(el.id, editingLineText);
                            setEditingLineId(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCommitLineLength(el.id, editingLineText);
                            setEditingLineId(null);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-10 text-center font-bold font-mono text-[11px] text-red-600 bg-transparent border-0 outline-none p-0 select-text"
                        placeholder="البعد"
                        title="اكتب البعد بالمتر مباشرة هنا"
                      />
                      <span className="text-[10px] font-bold text-red-500 font-mono select-none">
                        م
                      </span>
                    </div>
                  </div>
                </foreignObject>

                {/* Interactive Dimension Grips */}
                {isSelected && (
                  <>
                    <g className="cursor-crosshair">
                      <circle
                        cx={el.x}
                        cy={el.y}
                        r={13}
                        fill="transparent"
                        data-grip-type="start"
                        data-grip-element-id={el.id}
                      />
                      <rect
                        x={el.x - 5}
                        y={el.y - 5}
                        width={10}
                        height={10}
                        rx={2}
                        fill="#dc2626"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="pointer-events-none"
                      />
                    </g>
                    <g className="cursor-crosshair">
                      <circle
                        cx={el.x2}
                        cy={el.y2}
                        r={13}
                        fill="transparent"
                        data-grip-type="end"
                        data-grip-element-id={el.id}
                      />
                      <rect
                        x={el.x2 - 5}
                        y={el.y2 - 5}
                        width={10}
                        height={10}
                        rx={2}
                        fill="#dc2626"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="pointer-events-none"
                      />
                    </g>

                    {/* Midpoint handle for moving dimension */}
                    <g className="cursor-move">
                      <circle
                        cx={midX}
                        cy={midY}
                        r={16}
                        fill="transparent"
                        data-element-id={el.id}
                      />
                    </g>
                  </>
                )}
              </g>
            );
          }

          // Rectangles (supports regular building boxes and light-line boundaries)
          if (el.type === 'rect') {
            const isLight = el.isLight || el.strokeWidth <= 1.2 || el.strokeColor === '#94a3b8';
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-move"
                style={{ cursor: isDragging && isSelected ? 'grabbing' : 'grab' }}
              >
                {isSelected && (
                  <rect
                    x={el.x - 3}
                    y={el.y - 3}
                    width={(el.width || 40) + 6}
                    height={(el.height || 40) + 6}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                )}
                <rect
                  x={el.x}
                  y={el.y}
                  width={el.width || 40}
                  height={el.height || 40}
                  stroke={el.strokeColor || (isLight ? '#94a3b8' : '#334155')}
                  strokeWidth={el.strokeWidth || (isLight ? 1.2 : 1.8)}
                  strokeDasharray={el.strokeStyle === 'dashed' ? '5 3' : el.strokeStyle === 'dotted' ? '2 2' : 'none'}
                  fill={el.fillColor || (isLight ? '#f8fafc25' : 'transparent')}
                  data-element-id={el.id}
                />
                {el.label && (
                  <text
                    x={el.x + (el.width || 40) / 2}
                    y={el.y + (el.height || 40) / 2 + 4}
                    textAnchor="middle"
                    className="font-bold text-[11px] fill-slate-600 select-none pointer-events-none font-['Cairo',sans-serif]"
                  >
                    {el.label}
                  </text>
                )}
              </g>
            );
          }

          // Circles
          if (el.type === 'circle') {
            const r = (el.width || 40) / 2;
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
              >
                {isSelected && (
                  <circle
                    cx={el.x}
                    cy={el.y}
                    r={r + 3}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                )}
                <circle
                  cx={el.x}
                  cy={el.y}
                  r={r}
                  stroke={el.strokeColor}
                  strokeWidth={el.strokeWidth}
                  fill={el.fillColor || 'transparent'}
                  data-element-id={el.id}
                />
              </g>
            );
          }

          // SP Symbol (Service Point matching exactly IMG_5554 and IMG_5555)
          if (el.symbolKind === 'sp') {
            const r = 9;
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                {/* Outer dark blue border */}
                <circle
                  cx={el.x}
                  cy={el.y}
                  r={r}
                  fill="url(#spGlow)"
                  stroke="#0022cc"
                  strokeWidth={2}
                  data-element-id={el.id}
                />
                {/* Inner shine */}
                <circle
                  cx={el.x - 2}
                  cy={el.y - 2}
                  r={3}
                  fill="#ffffff"
                  fillOpacity={0.6}
                />
                {isSelected && (
                  <circle
                    cx={el.x}
                    cy={el.y}
                    r={r + 4}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                {/* Editable Name / Number Label & Controls directly beside SP */}
                {renderSymbolLabelAndControls(el, 'SP', 'top', 24, 24, '#00a2b8')}
              </g>
            );
          }

          // Substation Symbol (المحطة: صندوق بخطين عكسيين متقاطعين ⤫)
          if (el.symbolKind === 'substation') {
            const w = el.width || 44;
            const h = el.height || 24;
            const halfW = w / 2;
            const halfH = h / 2;
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                {/* Station Box with Two Reverse Diagonal Lines Inside (⤫) */}
                <g transform={`translate(${el.x - halfW}, ${el.y - halfH})`}>
                  <rect
                    width={w}
                    height={h}
                    fill="#fef08a"
                    stroke="#000000"
                    strokeWidth={1.8}
                    data-element-id={el.id}
                  />
                  {/* Reverse diagonal line 1 (top-left to bottom-right) */}
                  <line
                    x1={0}
                    y1={0}
                    x2={w}
                    y2={h}
                    stroke="#000000"
                    strokeWidth={1.5}
                    data-element-id={el.id}
                  />
                  {/* Reverse diagonal line 2 (top-right to bottom-left) */}
                  <line
                    x1={w}
                    y1={0}
                    x2={0}
                    y2={h}
                    stroke="#000000"
                    strokeWidth={1.5}
                    data-element-id={el.id}
                  />
                </g>
                {isSelected && (
                  <rect
                    x={el.x - halfW - 3}
                    y={el.y - halfH - 3}
                    width={w + 6}
                    height={h + 6}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                {/* Editable Name / Number Label & Controls directly beside Substation */}
                {renderSymbolLabelAndControls(el, 'محطة 973018', 'bottom', w, h, '#000000')}
              </g>
            );
          }

          // Cabinet Symbol (الكبينة: كابينة توزيع بنصفين مثلثين أصفر وأزرق)
          if (el.symbolKind === 'cabinet' || el.symbolKind === 'substation_cross') {
            const w = el.width || 44;
            const h = el.height || 24;
            const halfW = w / 2;
            const halfH = h / 2;
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                {/* Cabinet Box: split diagonally blue and yellow */}
                <g transform={`translate(${el.x - halfW}, ${el.y - halfH})`}>
                  {/* Outer border & yellow base */}
                  <rect
                    width={w}
                    height={h}
                    fill="#facc15"
                    stroke="#000000"
                    strokeWidth={1.5}
                    data-element-id={el.id}
                  />
                  {/* Dark Blue Triangle Half */}
                  <polygon
                    points={`0,0 ${w},0 0,${h}`}
                    fill="#0022cc"
                    data-element-id={el.id}
                  />
                  {/* Diagonal dividing line */}
                  <line
                    x1={0}
                    y1={h}
                    x2={w}
                    y2={0}
                    stroke="#000000"
                    strokeWidth={1}
                  />
                </g>
                {isSelected && (
                  <rect
                    x={el.x - halfW - 3}
                    y={el.y - halfH - 3}
                    width={w + 6}
                    height={h + 6}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                {/* Editable Name / Number Label & Controls directly beside Cabinet */}
                {renderSymbolLabelAndControls(el, 'كابينة C973018/5', 'bottom', w, h, '#000000')}
              </g>
            );
          }

          // Joint Symbol
          if (el.symbolKind === 'joint') {
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                <circle
                  cx={el.x}
                  cy={el.y}
                  r={7}
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  data-element-id={el.id}
                />
                <line
                  x1={el.x - 10}
                  y1={el.y}
                  x2={el.x + 10}
                  y2={el.y}
                  stroke="#dc2626"
                  strokeWidth={2}
                />
                <line
                  x1={el.x}
                  y1={el.y - 10}
                  x2={el.x}
                  y2={el.y + 10}
                  stroke="#dc2626"
                  strokeWidth={2}
                />
                {isSelected && (
                  <circle
                    cx={el.x}
                    cy={el.y}
                    r={14}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                {/* Editable Name / Number Label & Controls directly beside Joint */}
                {renderSymbolLabelAndControls(el, 'لحام 70', 'bottom', 20, 20, '#b91c1c')}
              </g>
            );
          }

          // North Arrow
          if (el.symbolKind === 'north_arrow') {
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                <polygon
                  points={`${el.x},${el.y - 25} ${el.x - 8},${el.y + 10} ${el.x},${el.y + 5}`}
                  fill="#000000"
                  data-element-id={el.id}
                />
                <polygon
                  points={`${el.x},${el.y - 25} ${el.x + 8},${el.y + 10} ${el.x},${el.y + 5}`}
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={1}
                  data-element-id={el.id}
                />
                <circle
                  cx={el.x}
                  cy={el.y}
                  r={18}
                  fill="none"
                  stroke="#000000"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
                {isSelected && (
                  <circle
                    cx={el.x}
                    cy={el.y}
                    r={24}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                {/* Editable Label & Controls beside North Arrow */}
                {renderSymbolLabelAndControls(el, 'N', 'top', 36, 48, '#000000')}
              </g>
            );
          }

          // Subscription Meter Box Symbol (رمز الاشتراك المعتمد مع كسر 2658 / 3853)
          if (el.symbolKind === 'subscription') {
            const w = el.width || 18;
            const h = el.height || 26;
            const halfW = w / 2;
            const halfH = h / 2;
            const topNum = el.subscriptionTop || (el.label?.split('/')[0]) || '2658';
            const bottomNum = el.subscriptionBottom || (el.label?.split('/')[1]) || '3853';

            return (
              <g
                key={el.id}
                data-element-id={el.id}
                className="cursor-pointer"
                onDoubleClick={() => handleDoubleClick(el)}
              >
                {/* Selection border */}
                {isSelected && (
                  <rect
                    x={el.x - halfW - 4}
                    y={el.y - halfH - 4}
                    width={w + 58}
                    height={h + 8}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    rx={3}
                  />
                )}

                {/* 1. Subscription Box Enclosure matching IMG_5583 */}
                <g transform={`translate(${el.x - halfW}, ${el.y - halfH})`}>
                  {/* Outer box */}
                  <rect
                    width={w}
                    height={h}
                    fill="#ffffff"
                    stroke={el.strokeColor || '#0022cc'}
                    strokeWidth={el.strokeWidth || 1.6}
                    data-element-id={el.id}
                  />
                  {/* Vertical partition line */}
                  <line
                    x1={w * 0.42}
                    y1={0}
                    x2={w * 0.42}
                    y2={h}
                    stroke={el.strokeColor || '#0022cc'}
                    strokeWidth={1.2}
                    data-element-id={el.id}
                  />
                  {/* Left compartment hatch diagonal lines */}
                  <line
                    x1={1}
                    y1={5}
                    x2={w * 0.42 - 1}
                    y2={2}
                    stroke={el.strokeColor || '#0022cc'}
                    strokeWidth={1}
                  />
                  <line
                    x1={1}
                    y1={11}
                    x2={w * 0.42 - 1}
                    y2={7}
                    stroke={el.strokeColor || '#0022cc'}
                    strokeWidth={1}
                  />
                  <line
                    x1={1}
                    y1={17}
                    x2={w * 0.42 - 1}
                    y2={13}
                    stroke={el.strokeColor || '#0022cc'}
                    strokeWidth={1}
                  />
                  <line
                    x1={1}
                    y1={23}
                    x2={w * 0.42 - 1}
                    y2={19}
                    stroke={el.strokeColor || '#0022cc'}
                    strokeWidth={1}
                  />

                  {/* Right compartment display window with green border */}
                  <rect
                    x={w * 0.52}
                    y={h * 0.38}
                    width={w * 0.36}
                    height={h * 0.26}
                    fill="#dcfce7"
                    stroke="#16a34a"
                    strokeWidth={1}
                    rx={0.5}
                    data-element-id={el.id}
                  />
                </g>

                {/* 2. Fraction Numbers directly to the right of the meter box matching IMG_5583 */}
                <line
                  x1={el.x + halfW + 3}
                  y1={el.y}
                  x2={el.x + halfW + 42}
                  y2={el.y}
                  stroke="#000000"
                  strokeWidth={1.4}
                  data-element-id={el.id}
                />

                {/* Top Number (e.g. 2658) */}
                {editingSubId === el.id && editingSubField === 'top' ? (
                  <foreignObject
                    x={el.x + halfW + 3}
                    y={el.y - 18}
                    width={50}
                    height={20}
                    className="overflow-visible pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingSubValue}
                      onChange={(e) => setEditingSubValue(e.target.value)}
                      onBlur={() => handleSaveSubNumber(el.id, 'top', editingSubValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSubNumber(el.id, 'top', editingSubValue);
                        if (e.key === 'Escape') setEditingSubId(null);
                      }}
                      className="w-full text-xs font-mono font-bold text-black border border-blue-500 rounded bg-white px-1 outline-none"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={el.x + halfW + 5}
                    y={el.y - 1}
                    className="font-mono font-bold text-[12px] fill-black select-none hover:fill-blue-600 transition-colors cursor-pointer"
                    textAnchor="start"
                    data-element-id={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSubId(el.id);
                      setEditingSubField('top');
                      setEditingSubValue(topNum);
                    }}
                  >
                    <title>انقر لتعديل الرقم العلوي للاشتراك</title>
                    {topNum}
                  </text>
                )}

                {/* Bottom Number (e.g. 3853) */}
                {editingSubId === el.id && editingSubField === 'bottom' ? (
                  <foreignObject
                    x={el.x + halfW + 3}
                    y={el.y + 1}
                    width={50}
                    height={20}
                    className="overflow-visible pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingSubValue}
                      onChange={(e) => setEditingSubValue(e.target.value)}
                      onBlur={() => handleSaveSubNumber(el.id, 'bottom', editingSubValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSubNumber(el.id, 'bottom', editingSubValue);
                        if (e.key === 'Escape') setEditingSubId(null);
                      }}
                      className="w-full text-xs font-mono font-bold text-black border border-blue-500 rounded bg-white px-1 outline-none"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={el.x + halfW + 5}
                    y={el.y + 11}
                    className="font-mono font-bold text-[12px] fill-black select-none hover:fill-blue-600 transition-colors cursor-pointer"
                    textAnchor="start"
                    data-element-id={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSubId(el.id);
                      setEditingSubField('bottom');
                      setEditingSubValue(bottomNum);
                    }}
                  >
                    <title>انقر لتعديل رقم العداد السفلي</title>
                    {bottomNum}
                  </text>
                )}

                {/* Floating Quick Action toolbar when this subscription symbol is selected */}
                {isSelected && (
                  <foreignObject
                    x={el.x - 45}
                    y={el.y - halfH - 38}
                    width={150}
                    height={32}
                    className="overflow-visible pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1.5 bg-slate-950 text-white px-2.5 py-1 rounded-full shadow-2xl border border-blue-500/50 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditSymbolName) {
                            onEditSymbolName(el);
                          } else {
                            handleDoubleClick(el);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-amber-400 text-amber-300"
                        title="تعديل أرقام الاشتراك والعداد"
                      >
                        <span>✏️</span>
                        <span>أرقام الاشتراك</span>
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = elements.filter((x) => x.id !== el.id);
                          setElements(updated);
                          onElementsChange?.(updated);
                          setSelectedElementId(null);
                        }}
                        className="text-rose-400 hover:text-rose-300 px-1 hover:bg-rose-950/40 rounded"
                        title="حذف الرمز"
                      >
                        ✕
                      </button>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          }

          // Custom Symbols pinned to toolbar
          if (el.type === 'custom_symbol') {
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <rect
                    x={el.x - 18}
                    y={el.y - 18}
                    width={36}
                    height={36}
                    rx={6}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                <rect
                  x={el.x - 14}
                  y={el.y - 14}
                  width={28}
                  height={28}
                  rx={4}
                  fill={el.fillColor || '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth={2}
                  data-element-id={el.id}
                />
                <text
                  x={el.x}
                  y={el.y + 4}
                  textAnchor="middle"
                  className="font-bold text-[10px] fill-white select-none pointer-events-none"
                >
                  {el.label?.slice(0, 3) || 'SYM'}
                </text>
                {/* Editable Label & Controls beside Custom Symbol */}
                {renderSymbolLabelAndControls(el, el.label || 'رمز مخصص', 'bottom', 28, 28, '#0284c7')}
              </g>
            );
          }

          // Text Element
          if (el.type === 'text') {
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                {isSelected && editingLabelId !== el.id && (
                  <rect
                    x={el.x - 4}
                    y={el.y - (el.fontSize || 13)}
                    width={(el.text?.length || 5) * 8 + 10}
                    height={(el.fontSize || 13) + 8}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}
                {editingLabelId === el.id ? (
                  <foreignObject
                    x={el.x - 4}
                    y={el.y - 16}
                    width={180}
                    height={30}
                    className="overflow-visible pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={tempLabelText}
                      onChange={(e) => setTempLabelText(e.target.value)}
                      onBlur={() => handleSaveLabel(el.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLabel(el.id);
                        if (e.key === 'Escape') setEditingLabelId(null);
                      }}
                      className="bg-white border-2 border-blue-500 rounded px-1.5 py-0.5 text-xs font-bold font-['Cairo',sans-serif] text-slate-900 outline-none shadow-md w-full"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={el.x}
                    y={el.y}
                    fontSize={el.fontSize || 13}
                    className="font-['Cairo',sans-serif] font-bold fill-gray-900 select-none"
                    data-element-id={el.id}
                  >
                    {el.text}
                  </text>
                )}
              </g>
            );
          }

          // Textbox Element (مربع نصي محدد مع إمكانية كتابة نص وتحريك وتغيير حجم)
          if (el.type === 'textbox') {
            const w = el.width || 140;
            const h = el.height || 52;
            const isEditing = editingLabelId === el.id;

            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => {
                  setEditingLabelId(el.id);
                  setTempLabelText(el.text || '');
                }}
                className="cursor-pointer"
              >
                {/* Border Box with fill */}
                <rect
                  x={el.x}
                  y={el.y}
                  width={w}
                  height={h}
                  rx={4}
                  fill={el.fillColor || '#ffffff'}
                  stroke={isSelected ? '#3b82f6' : (el.strokeColor || '#334155')}
                  strokeWidth={isSelected ? 2 : (el.strokeWidth || 1.5)}
                  strokeDasharray={isSelected ? '4 2' : 'none'}
                  data-element-id={el.id}
                  className="shadow-sm"
                />

                {/* Text Content inside Box */}
                <foreignObject
                  x={el.x + 3}
                  y={el.y + 3}
                  width={Math.max(20, w - 6)}
                  height={Math.max(20, h - 6)}
                  className="overflow-hidden"
                >
                  {isEditing ? (
                    <div className="w-full h-full flex items-center justify-center p-0.5">
                      <textarea
                        autoFocus
                        value={tempLabelText}
                        onChange={(e) => setTempLabelText(e.target.value)}
                        onBlur={() => handleSaveLabel(el.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleSaveLabel(el.id);
                          } else if (e.key === 'Escape') {
                            setEditingLabelId(null);
                          }
                        }}
                        className="w-full h-full text-xs font-bold text-slate-900 bg-amber-50/90 border border-orange-400 rounded outline-none p-1 text-center resize-none select-text font-['Cairo',sans-serif]"
                        placeholder="اكتب في المربع النصي..."
                      />
                    </div>
                  ) : (
                    <div
                      data-element-id={el.id}
                      className="w-full h-full flex items-center justify-center text-center p-1 font-bold text-slate-800 text-xs select-none leading-snug break-words font-['Cairo',sans-serif]"
                      style={{ fontSize: `${el.fontSize || 12}px` }}
                      title="انقر نقراً مزدوجاً لتحرير النص بالمربع"
                    >
                      {el.text || 'مربع نصي'}
                    </div>
                  )}
                </foreignObject>

                {/* Resize Grip at Bottom-Right */}
                {isSelected && (
                  <g className="cursor-se-resize">
                    <title>سحب لتغيير حجم المربع النصي</title>
                    <circle
                      cx={el.x + w}
                      cy={el.y + h}
                      r={7}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      data-grip-type="resize-textbox"
                      data-grip-element-id={el.id}
                    />
                  </g>
                )}
              </g>
            );
          }

          // Image / Signature / Stamp
          if (
            (el.type === 'image' ||
              el.type === 'signature' ||
              el.type === 'stamp') &&
            el.imageUrl
          ) {
            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onDoubleClick={() => handleDoubleClick(el)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <rect
                    x={el.x - 2}
                    y={el.y - 2}
                    width={(el.width || 120) + 4}
                    height={(el.height || 60) + 4}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                )}
                <image
                  href={el.imageUrl}
                  x={el.x}
                  y={el.y}
                  width={el.width || 120}
                  height={el.height || 60}
                  preserveAspectRatio="xMidYMid meet"
                  data-element-id={el.id}
                />
              </g>
            );
          }

          return null;
        })}

        {/* Live Drawing Preview */}
        {drawingStart && currentMouse && (
          <g>
            {activeTool === 'cable_kasht' && (
              <>
                <MillingCorridor
                  x1={drawingStart.x}
                  y1={drawingStart.y}
                  x2={currentMouse.x}
                  y2={currentMouse.y}
                  cableColor="#0022cc"
                  cableWidth={2.8}
                  showCable={true}
                />
                <circle cx={drawingStart.x} cy={drawingStart.y} r={3} fill="#2563eb" />
                <circle cx={currentMouse.x} cy={currentMouse.y} r={3} fill="#2563eb" />
                <text
                  x={(drawingStart.x + currentMouse.x) / 2}
                  y={(drawingStart.y + currentMouse.y) / 2 - 20}
                  textAnchor="middle"
                  className="font-bold text-[11px] fill-blue-700 bg-white px-1 font-mono"
                >
                  كشط {(
                    Math.hypot(
                      currentMouse.x - drawingStart.x,
                      currentMouse.y - drawingStart.y
                    ) / PIXELS_PER_METER
                  ).toFixed(2)} M
                </text>
              </>
            )}

            {(activeTool === 'line' ||
              activeTool === 'cable_as' ||
              activeTool === 'cable_ng' ||
              activeTool === 'cable_t') && (
              <>
                <line
                  x1={drawingStart.x}
                  y1={drawingStart.y}
                  x2={currentMouse.x}
                  y2={currentMouse.y}
                  stroke={
                    activeTool === 'cable_ng'
                      ? '#0022cc'
                      : activeTool === 'cable_t'
                      ? '#059669'
                      : '#0022cc'
                  }
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                />
                <circle
                  cx={drawingStart.x}
                  cy={drawingStart.y}
                  r={3}
                  fill="#3b82f6"
                />
                <circle
                  cx={currentMouse.x}
                  cy={currentMouse.y}
                  r={3}
                  fill="#3b82f6"
                />
                <text
                  x={(drawingStart.x + currentMouse.x) / 2}
                  y={(drawingStart.y + currentMouse.y) / 2 - 8}
                  textAnchor="middle"
                  className="font-bold text-[11px] fill-blue-700 bg-white"
                >
                  {(
                    Math.hypot(
                      currentMouse.x - drawingStart.x,
                      currentMouse.y - drawingStart.y
                    ) / PIXELS_PER_METER
                  ).toFixed(2)}
                  M
                </text>
              </>
            )}

            {(activeTool === 'rect' || activeTool === 'light_rect') && (
              <rect
                x={Math.min(drawingStart.x, currentMouse.x)}
                y={Math.min(drawingStart.y, currentMouse.y)}
                width={Math.abs(currentMouse.x - drawingStart.x)}
                height={Math.abs(currentMouse.y - drawingStart.y)}
                fill={activeTool === 'light_rect' ? '#f8fafc30' : '#3b82f615'}
                stroke={activeTool === 'light_rect' ? '#94a3b8' : '#3b82f6'}
                strokeWidth={activeTool === 'light_rect' ? 1.2 : 1.5}
                strokeDasharray={activeTool === 'light_rect' ? '4 2' : '4 2'}
              />
            )}

            {activeTool === 'circle' && (
              <circle
                cx={drawingStart.x}
                cy={drawingStart.y}
                r={Math.hypot(
                  currentMouse.x - drawingStart.x,
                  currentMouse.y - drawingStart.y
                )}
                fill="#3b82f6"
                fillOpacity={0.1}
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            )}

            {activeTool === 'dimension' && (
              <line
                x1={drawingStart.x}
                y1={drawingStart.y}
                x2={currentMouse.x}
                y2={currentMouse.y}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            )}
          </g>
        )}

        {/* Live stretching dimension tooltip badge */}
        {liveGripCoord && liveGripLength !== null && (
          <g
            transform={`translate(${liveGripCoord.x}, ${liveGripCoord.y - 18})`}
            className="pointer-events-none select-none"
          >
            <rect
              x={-44}
              y={-14}
              width={88}
              height={24}
              rx={6}
              fill="#0f172a"
              fillOpacity={0.94}
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={2}
              textAnchor="middle"
              fill="#ffffff"
              className="font-mono font-black text-[12px] tracking-wide"
            >
              📏 {liveGripLength.toFixed(2)} م
            </text>
          </g>
        )}
      </svg>

    </div>
  );
};
