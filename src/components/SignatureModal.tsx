import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, Stamp as StampIcon, PenTool, Upload } from 'lucide-react';
import { WorkOrderData } from '../types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToCanvas: (dataUrl: string, type: 'signature' | 'stamp') => void;
  onApplyToRole?: (roleKey: keyof WorkOrderData['approvals'], dataUrl: string) => void;
  initialRole?: keyof WorkOrderData['approvals'];
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onInsertToCanvas,
  onApplyToRole,
  initialRole,
}) => {
  const [tab, setTab] = useState<'sign' | 'stamp' | 'upload'>('sign');
  const [selectedRole, setSelectedRole] = useState<keyof WorkOrderData['approvals'] | 'canvas'>(
    initialRole || 'canvas'
  );

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0022cc'); // blue ink or black ink

  // Stamp settings
  const [stampText, setStampText] = useState('معتمد - شركة الجوان المتطورة');
  const [stampSubText, setStampSubText] = useState('قسم المساحة والشبكات الكهربائية');
  const [stampDate, setStampDate] = useState('2026/05/30');
  const [stampColor, setStampColor] = useState('#dc2626'); // red stamp or blue stamp

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  useEffect(() => {
    if (tab === 'sign' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = penColor;
      }
    }
  }, [tab, penColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleApplySignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (selectedRole !== 'canvas' && onApplyToRole) {
      onApplyToRole(selectedRole, dataUrl);
    } else {
      onInsertToCanvas(dataUrl, 'signature');
    }
    onClose();
  };

  // Generate Stamp as PNG
  const handleGenerateStamp = () => {
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = 300;
    stampCanvas.height = 300;
    const ctx = stampCanvas.getContext('2d');
    if (!ctx) return;

    // Draw circular stamp
    const cx = 150;
    const cy = 150;
    const r = 135;

    ctx.strokeStyle = stampColor;
    ctx.fillStyle = stampColor;

    // Outer double circles
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed or star ring
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, r - 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text in center
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 15px Cairo, sans-serif';
    ctx.fillText(stampText, cx, cy - 20);

    ctx.font = '12px Cairo, sans-serif';
    ctx.fillText(stampSubText, cx, cy + 5);

    ctx.font = 'bold 13px monospace';
    ctx.fillText(stampDate, cx, cy + 30);

    // Stars
    ctx.font = '16px sans-serif';
    ctx.fillText('★ ★ ★', cx, cy - 50);

    const dataUrl = stampCanvas.toDataURL('image/png');

    if (selectedRole !== 'canvas' && onApplyToRole) {
      onApplyToRole(selectedRole, dataUrl);
    } else {
      onInsertToCanvas(dataUrl, 'stamp');
    }
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (selectedRole !== 'canvas' && onApplyToRole) {
          onApplyToRole(selectedRole, dataUrl);
        } else {
          onInsertToCanvas(dataUrl, 'stamp');
        }
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <StampIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">إضافة ختم أو توقيع معتمد</h2>
              <p className="text-[11px] text-slate-400">
                يمكنك التوقيع بيدك أو إنشاء ختم رسمي أو رفع صورة ختم
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

        {/* Destination selection */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">مكان الإدراج:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="canvas">داخل الرسم المساحي (حر التحريك)</option>
            <option value="contractorRep">جدول التواقيع: مندوب المقاول</option>
            <option value="secEmployee">جدول التواقيع: موظف الكهرباء</option>
            <option value="boqReceiver">جدول التواقيع: مستلم المقايسة</option>
            <option value="dataEntry">جدول التواقيع: مدخل لبيانات</option>
            <option value="itemsReviewer">جدول التواقيع: مراجعة البنود</option>
            <option value="approval">جدول التواقيع: الاعتماد</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white gap-2">
          <button
            onClick={() => setTab('sign')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'sign'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>توقيع إلكتروني باليد</span>
          </button>

          <button
            onClick={() => setTab('stamp')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'stamp'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <StampIcon className="w-3.5 h-3.5" />
            <span>ختم رسمي معتمد</span>
          </button>

          <button
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              tab === 'upload'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع صورة توقيع / ختم</span>
          </button>
        </div>

        {/* Tab 1: Draw Signature */}
        {tab === 'sign' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                وقع باستخدام الفأرة أو شاشة اللمس:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-[11px]">لون الحبر:</span>
                <button
                  onClick={() => setPenColor('#0022cc')}
                  className={`w-5 h-5 rounded-full bg-blue-700 ${
                    penColor === '#0022cc' ? 'ring-2 ring-orange-500' : ''
                  }`}
                />
                <button
                  onClick={() => setPenColor('#0f172a')}
                  className={`w-5 h-5 rounded-full bg-slate-900 ${
                    penColor === '#0f172a' ? 'ring-2 ring-orange-500' : ''
                  }`}
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={440}
                height={160}
                className="w-full h-40 touch-none cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs">
                  ضع التوقيع هنا...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>

              <button
                type="button"
                onClick={handleApplySignature}
                disabled={!hasDrawn}
                className={`flex items-center gap-1 px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                  hasDrawn
                    ? 'bg-orange-600 hover:bg-orange-500'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>إدراج التوقيع</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Stamp Generator */}
        {tab === 'stamp' && (
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص الختم الرئيسي
                </label>
                <input
                  type="text"
                  value={stampText}
                  onChange={(e) => setStampText(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الجهة / القسم
                </label>
                <input
                  type="text"
                  value={stampSubText}
                  onChange={(e) => setStampSubText(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الاعتماد
                  </label>
                  <input
                    type="text"
                    value={stampDate}
                    onChange={(e) => setStampDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    لون الختم
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setStampColor('#dc2626')}
                      className={`px-3 py-1 text-xs rounded font-bold border transition-all ${
                        stampColor === '#dc2626'
                          ? 'bg-rose-50 text-rose-700 border-rose-400'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      أحمر
                    </button>
                    <button
                      type="button"
                      onClick={() => setStampColor('#0022cc')}
                      className={`px-3 py-1 text-xs rounded font-bold border transition-all ${
                        stampColor === '#0022cc'
                          ? 'bg-blue-50 text-blue-700 border-blue-400'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      أزرق
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stamp Live Preview */}
            <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div
                className="w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center text-center p-2 select-none"
                style={{ borderColor: stampColor, color: stampColor }}
              >
                <div className="text-[10px] tracking-widest">★ ★ ★</div>
                <div className="font-bold text-[10px] leading-tight mt-1">{stampText}</div>
                <div className="text-[8px] leading-tight mt-0.5">{stampSubText}</div>
                <div className="font-mono text-[9px] font-bold mt-1">{stampDate}</div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleGenerateStamp}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all"
              >
                <StampIcon className="w-4 h-4" />
                <span>إدراج الختم الرسمي</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Upload Image */}
        {tab === 'upload' && (
          <div className="p-6 space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 flex flex-col items-center justify-center">
              <Upload className="w-10 h-10 text-orange-500 mb-2" />
              <p className="text-xs font-bold text-slate-700 mb-1">
                اختر صورة الختم أو التوقيع الشفافة (PNG / JPG)
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                يفضل استخدام صورة مفرغة الخلفية
              </p>
              <label className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer">
                <span>استعراض الملفات</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
