import React, { useState, useRef, useEffect } from 'react';
import { PageAnnotation } from '../types';
import {
  Type,
  Trash2,
  Check,
  Plus,
  Minus,
  Square,
  Move,
  Edit3,
  X,
} from 'lucide-react';

interface PageTextOverlayProps {
  annotations: PageAnnotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<PageAnnotation[]>>;
  isAddPageTextActive: boolean;
  setIsAddPageTextActive: (active: boolean) => void;
  onAnnotationsChange?: (newAnnotations: PageAnnotation[]) => void;
}

export const PageTextOverlay: React.FC<PageTextOverlayProps> = ({
  annotations,
  setAnnotations,
  isAddPageTextActive,
  setIsAddPageTextActive,
  onAnnotationsChange,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const colors = [
    { label: 'أسود', value: '#0f172a' },
    { label: 'أزرق', value: '#1d4ed8' },
    { label: 'أحمر', value: '#dc2626' },
    { label: 'أخضر', value: '#15803d' },
    { label: 'برتقالي', value: '#ea580c' },
  ];

  // Handle click on container to add new text if active
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddPageTextActive || !containerRef.current) return;

    // Only trigger if clicking on container or background, not an existing note
    if ((e.target as HTMLElement).closest('.page-annotation-item')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(680, e.clientX - rect.left));
    const y = Math.max(10, Math.min(1000, e.clientY - rect.top));

    const newNote: PageAnnotation = {
      id: `page-text-${Date.now()}`,
      text: 'ملاحظة جديدة',
      x: Math.round(x),
      y: Math.round(y),
      fontSize: 13,
      color: '#0f172a',
      isBoxed: true,
      backgroundColor: '#ffffff',
      borderColor: '#94a3b8',
      fontWeight: 'bold',
    };

    const updated = [...annotations, newNote];
    setAnnotations(updated);
    onAnnotationsChange?.(updated);
    setSelectedId(newNote.id);
    setEditingId(newNote.id);
    setEditingText('ملاحظة جديدة');
    setIsAddPageTextActive(false);
  };

  // Drag mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId || !dragStartRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const newX = Math.max(5, Math.min(710, dragStartRef.current.initialX + dx));
      const newY = Math.max(5, Math.min(1020, dragStartRef.current.initialY + dy));

      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === draggingId
            ? { ...item, x: Math.round(newX), y: Math.round(newY) }
            : item
        )
      );
    };

    const handleMouseUp = () => {
      if (draggingId) {
        setDraggingId(null);
        dragStartRef.current = null;
        onAnnotationsChange?.(annotations);
      }
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, annotations, onAnnotationsChange, setAnnotations]);

  // Handle saving inline text
  const handleSaveText = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      // Remove if empty
      const updated = annotations.filter((a) => a.id !== id);
      setAnnotations(updated);
      onAnnotationsChange?.(updated);
    } else {
      const updated = annotations.map((a) =>
        a.id === id ? { ...a, text: trimmed } : a
      );
      setAnnotations(updated);
      onAnnotationsChange?.(updated);
    }
    setEditingId(null);
  };

  const handleDeleteAnnotation = (id: string) => {
    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    onAnnotationsChange?.(updated);
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdateProp = <K extends keyof PageAnnotation>(
    id: string,
    key: K,
    val: PageAnnotation[K]
  ) => {
    const updated = annotations.map((a) => (a.id === id ? { ...a, [key]: val } : a));
    setAnnotations(updated);
    onAnnotationsChange?.(updated);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`absolute inset-0 z-20 font-['Cairo',sans-serif] ${
        isAddPageTextActive
          ? 'cursor-crosshair pointer-events-auto bg-blue-500/5 ring-4 ring-blue-500/20'
          : 'pointer-events-none'
      }`}
      style={{ width: '740px', height: '1046px' }}
    >
      {/* Visual notification when "Click to add text anywhere" is active */}
      {isAddPageTextActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-1.5 rounded-full shadow-xl border border-blue-500 flex items-center gap-2 text-xs font-bold animate-pulse pointer-events-auto select-none">
          <Type className="w-4 h-4 text-blue-400" />
          <span>انقر في أي مكان من الصفحة لإدراج نص كتابي فوراً</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddPageTextActive(false);
            }}
            className="p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white mr-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Render all page-wide annotations */}
      {annotations.map((item) => {
        const isSelected = selectedId === item.id;
        const isEditing = editingId === item.id;

        return (
          <div
            key={item.id}
            className={`page-annotation-item absolute pointer-events-auto select-none transition-shadow ${
              isSelected ? 'z-30 ring-2 ring-blue-500 rounded shadow-lg' : 'hover:ring-1 hover:ring-blue-300'
            }`}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              fontSize: `${item.fontSize}px`,
              color: item.color,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setSelectedId(item.id);
              setEditingId(item.id);
              setEditingText(item.text);
            }}
          >
            {/* Annotation Content */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${
                item.isBoxed
                  ? 'bg-white/95 border shadow-xs'
                  : 'bg-transparent'
              }`}
              style={{
                borderColor: item.isBoxed ? (item.borderColor || '#94a3b8') : 'transparent',
                fontWeight: item.fontWeight || 'bold',
              }}
            >
              {/* Drag Handle when selected */}
              {isSelected && !isEditing && (
                <div
                  className="cursor-move p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingId(item.id);
                    dragStartRef.current = {
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                      initialX: item.x,
                      initialY: item.y,
                    };
                  }}
                  title="سحب وتحريك النص في أي مكان على الصفحة"
                >
                  <Move className="w-3 h-3" />
                </div>
              )}

              {/* Text display or inline editing input */}
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => handleSaveText(item.id, editingText)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveText(item.id, editingText);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="font-bold bg-white text-slate-900 border border-blue-500 rounded px-1.5 py-0.5 outline-none font-['Cairo',sans-serif]"
                    style={{ fontSize: `${item.fontSize}px`, color: item.color }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveText(item.id, editingText)}
                    className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                    title="حفظ النص"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span
                  className="cursor-pointer font-['Cairo',sans-serif] leading-tight break-words select-none"
                  style={{ color: item.color }}
                  title="انقر نقراً مزدوجاً لتحرير النص، أو اسحبه لتحريكه"
                >
                  {item.text}
                </span>
              )}
            </div>

            {/* Floating formatting bar when selected */}
            {isSelected && !isEditing && (
              <div
                className="absolute top-full right-0 mt-1.5 bg-slate-900 text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 z-50 text-[11px] border border-slate-700 animate-in fade-in duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Edit Text Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingText(item.text);
                  }}
                  className="flex items-center gap-1 px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="تحرير النص"
                >
                  <Edit3 className="w-3 h-3 text-cyan-400" />
                  <span>تعديل</span>
                </button>

                {/* Font Size Minus */}
                <button
                  type="button"
                  onClick={() => handleUpdateProp(item.id, 'fontSize', Math.max(9, item.fontSize - 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="تصغير حجم الخط"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono text-[10px] text-slate-300 px-0.5 font-bold">
                  {item.fontSize}px
                </span>
                {/* Font Size Plus */}
                <button
                  type="button"
                  onClick={() => handleUpdateProp(item.id, 'fontSize', Math.min(32, item.fontSize + 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="تكبير حجم الخط"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Box toggle */}
                <button
                  type="button"
                  onClick={() => handleUpdateProp(item.id, 'isBoxed', !item.isBoxed)}
                  className={`p-1 rounded transition-colors ${
                    item.isBoxed ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                  title="تبديل الإطار والصندوق"
                >
                  <Square className="w-3 h-3" />
                </button>

                {/* Color dots */}
                <div className="flex items-center gap-1 px-1 border-r border-l border-slate-700">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleUpdateProp(item.id, 'color', c.value)}
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        item.color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteAnnotation(item.id)}
                  className="p-1 rounded hover:bg-rose-900/60 text-rose-400 hover:text-rose-300"
                  title="حذف هذا النص"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Close toolbar */}
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400"
                  title="إغلاق"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
