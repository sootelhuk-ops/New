import React, { useRef } from 'react';
import { WorkOrderData } from '../types';

interface FooterTableProps {
  workOrder: WorkOrderData;
  setWorkOrder?: React.Dispatch<React.SetStateAction<WorkOrderData>>;
  onEditCell?: (roleKey: keyof WorkOrderData['approvals'], field: 'name' | 'date' | 'signature') => void;
  interactive?: boolean;
}

export const FooterTable: React.FC<FooterTableProps> = ({
  workOrder,
  setWorkOrder,
  onEditCell,
  interactive = true,
}) => {
  const borderOrange = 'border-[#ea7c15]';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeRoleRef = useRef<keyof WorkOrderData['approvals'] | null>(null);

  // Ordered from Right to Left:
  // 1. مندوب المقاول -> 2. موظف الكهرباء -> 3. مستلم المقايسة -> 4. مدخل البيانات -> 5. مراجعة البنود -> 6. الاعتماد
  const roles = [
    { key: 'contractorRep' as const, label: 'مندوب المقاول' },
    { key: 'secEmployee' as const, label: 'موظف الكهرباء' },
    { key: 'boqReceiver' as const, label: 'مستلم المقايسة' },
    { key: 'dataEntry' as const, label: 'مدخل البيانات' },
    { key: 'itemsReviewer' as const, label: 'مراجعة البنود' },
    { key: 'approval' as const, label: 'الاعتماد' },
  ];

  const handleFieldChange = (
    role: keyof WorkOrderData['approvals'],
    field: 'name' | 'date',
    value: string
  ) => {
    if (!setWorkOrder) return;
    setWorkOrder((prev) => ({
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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const role = activeRoleRef.current;
    if (file && role && setWorkOrder) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setWorkOrder((prev) => ({
          ...prev,
          approvals: {
            ...prev.approvals,
            [role]: {
              ...prev.approvals[role],
              signature: dataUrl,
              date: prev.approvals[role]?.date || prev.deliveryDate || '30/5/2026',
            },
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureClick = (roleKey: keyof WorkOrderData['approvals']) => {
    if (onEditCell) {
      onEditCell(roleKey, 'signature');
    } else {
      activeRoleRef.current = roleKey;
      fileInputRef.current?.click();
    }
  };

  const inputBaseClass =
    'w-full h-full text-center bg-transparent border-0 focus:outline-none focus:bg-orange-100/60 hover:bg-orange-50/40 rounded text-inherit font-inherit py-0.5 px-0.5 transition-colors';

  return (
    <div className="w-full select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSignatureUpload}
        className="hidden"
      />
      {/* Table spans full width of the survey sheet, aligned from Right to Left */}
      <div className={`w-full border-t ${borderOrange} bg-white text-black font-['Cairo',sans-serif] text-[11px]`}>
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className={`h-6 border-b ${borderOrange} font-bold text-gray-800`}>
              {/* 1. Row title column on the RIGHT side in RTL */}
              <th className={`w-[13%] font-bold text-gray-800 border-l ${borderOrange} bg-slate-50/50`}>
                البيان
              </th>

              {/* 2. Approval roles from Right to Left */}
              {roles.map((role) => (
                <th
                  key={role.key}
                  className={`border-l ${borderOrange} px-1 font-semibold text-[11px] w-[14.5%]`}
                >
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* صف الاسم: يبدأ من اليمين بـ "الاسم" ثم أسماء أصحاب الاعتمادات من اليمين لليسار */}
            <tr className={`h-6 border-b ${borderOrange}`}>
              {/* عنوان الصف على اليمين */}
              <td className={`font-bold text-gray-800 border-l ${borderOrange} bg-slate-50/50 w-[13%]`}>
                الاسم
              </td>

              {/* خلايا الأسماء من اليمين إلى اليسار */}
              {roles.map((role) => {
                const data = workOrder.approvals[role.key];
                return (
                  <td
                    key={role.key}
                    className={`border-l ${borderOrange} text-[11px] p-0 font-medium text-gray-800 w-[14.5%]`}
                  >
                    <input
                      type="text"
                      value={data?.name || ''}
                      onChange={(e) => handleFieldChange(role.key, 'name', e.target.value)}
                      placeholder="—"
                      className={inputBaseClass}
                      title="اكتب الاسم مباشرة هنا"
                    />
                  </td>
                );
              })}
            </tr>

            {/* صف التاريخ: يبدأ من اليمين بـ "التاريخ" ثم تواريخ الاعتمادات من اليمين لليسار */}
            <tr className={`h-6 border-b ${borderOrange}`}>
              {/* عنوان الصف على اليمين */}
              <td className={`font-bold text-gray-800 border-l ${borderOrange} bg-slate-50/50 w-[13%]`}>
                التاريخ
              </td>

              {/* خلايا التواريخ من اليمين إلى اليسار */}
              {roles.map((role) => {
                const data = workOrder.approvals[role.key];
                return (
                  <td
                    key={role.key}
                    className={`border-l ${borderOrange} text-[10px] font-mono p-0 font-medium text-gray-800 w-[14.5%]`}
                  >
                    <input
                      type="text"
                      value={data?.date || ''}
                      onChange={(e) => handleFieldChange(role.key, 'date', e.target.value)}
                      placeholder="—"
                      className={`${inputBaseClass} font-mono text-[10px]`}
                      title="اكتب التاريخ مباشرة هنا"
                    />
                  </td>
                );
              })}
            </tr>

            {/* صف التوقيع: يبدأ من اليمين بـ "التوقيع" ثم أماكن التواقيع من اليمين لليسار */}
            <tr className="h-9">
              {/* عنوان الصف على اليمين */}
              <td className={`font-bold text-gray-800 border-l ${borderOrange} bg-slate-50/50 align-middle w-[13%]`}>
                التوقيـــــع
              </td>

              {/* خلايا التواقيع من اليمين إلى اليسار */}
              {roles.map((role) => {
                const data = workOrder.approvals[role.key];
                return (
                  <td
                    key={role.key}
                    onClick={() => interactive && handleSignatureClick(role.key)}
                    className={`border-l ${borderOrange} text-[10px] px-1 align-middle relative overflow-hidden w-[14.5%] ${
                      interactive ? 'cursor-pointer hover:bg-orange-50/40' : ''
                    }`}
                    title={interactive ? 'انقر لإدراج التوقيع أو رفعه مباشرة' : undefined}
                  >
                    {data?.signature ? (
                      <div className="h-8 flex items-center justify-center">
                        <img
                          src={data.signature}
                          alt="Signature"
                          className="max-h-7 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[10px] hover:text-orange-600 font-bold">
                        {interactive ? '+ توقيع' : ''}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
