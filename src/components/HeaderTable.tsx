import React from 'react';
import { WorkOrderData } from '../types';
import { CompanyLogo } from './CompanyLogo';

interface HeaderTableProps {
  workOrder: WorkOrderData;
  setWorkOrder?: React.Dispatch<React.SetStateAction<WorkOrderData>>;
  interactive?: boolean;
}

export const HeaderTable: React.FC<HeaderTableProps> = ({
  workOrder,
  setWorkOrder,
  interactive = true,
}) => {
  const borderOrange = 'border-[#ea7c15]';

  const handleFieldChange = (field: keyof WorkOrderData, value: string) => {
    if (!setWorkOrder) return;
    setWorkOrder((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (
    category: 'welds' | 'cables' | 'lugs' | 'terminations',
    subField: string,
    value: string
  ) => {
    if (!setWorkOrder) return;
    setWorkOrder((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subField]: value,
      },
    }));
  };

  const inputBaseClass =
    'w-full h-full text-center bg-transparent border-0 focus:outline-none focus:bg-orange-100/60 hover:bg-orange-50/40 rounded text-inherit font-inherit py-0.5 px-0.5 transition-colors';

  return (
    <div className="w-full bg-white text-black font-['Cairo',sans-serif] text-[11px] leading-tight select-none">
      {/* Top 3-Row Grid: Ordered from Right to Left with Order Number on the Right */}
      <table className={`w-full border-collapse border-b ${borderOrange}`}>
        <tbody>
          {/* Row 1 */}
          <tr className="h-7 text-center">
            {/* 1. Order Number Label (Right side in RTL) */}
            <td className={`w-[12%] border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              رقم البلاغ
            </td>

            {/* 2. Order Number Value */}
            <td className={`w-[14%] border-l ${borderOrange} font-bold text-gray-900 font-mono text-[12px] p-0`}>
              <input
                type="text"
                value={workOrder.orderNumber || '00000000'}
                onChange={(e) => handleFieldChange('orderNumber', e.target.value)}
                className={`${inputBaseClass} font-bold font-mono text-[12px]`}
                title="تعديل رقم البلاغ مباشرة"
              />
            </td>

            {/* 3. Asphalt Label */}
            <td className={`w-[12%] border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              اسفلت {'{AS}'}
            </td>

            {/* 4. Asphalt Length Value */}
            <td className={`w-[12%] border-l ${borderOrange} font-medium text-gray-900 font-mono p-0 relative`}>
              <input
                type="text"
                value={workOrder.asphaltLength || '10.00 M'}
                onChange={(e) => handleFieldChange('asphaltLength', e.target.value)}
                className={`${inputBaseClass} font-mono`}
                title="تعديل طول الأسفلت مباشرة"
              />
            </td>

            {/* 5. Trench Length Label */}
            <td className={`w-[12%] border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              طول الحفريه
            </td>

            {/* 6. Trench Length short badge */}
            <td className={`w-[10%] border-l ${borderOrange} font-bold text-[13px] text-gray-900 p-0`}>
              <input
                type="text"
                value={workOrder.trenchLengthDisplay || '10M'}
                onChange={(e) => handleFieldChange('trenchLengthDisplay', e.target.value)}
                className={`${inputBaseClass} font-black font-mono text-[13px] text-gray-900`}
                title="تعديل طول الحفرية المختصر مباشرة (مثال: 10M أو 15M)"
              />
            </td>

            {/* 7. Logo spanning 3 rows on the FAR LEFT */}
            <td
              rowSpan={3}
              className={`w-[28%] p-0 align-middle bg-white`}
            >
              <CompanyLogo
                customLogoUrl={workOrder.companyLogoUrl}
                companyNameAr={workOrder.companyNameAr}
                companyNameEn={workOrder.companyNameEn}
                companyCode={workOrder.companyCode}
              />
            </td>
          </tr>

          {/* Row 2 */}
          <tr className="h-7 text-center">
            {/* 1. Station Number Label (Right side in RTL) */}
            <td className={`border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              رقم محطة
            </td>

            {/* 2. Station Number Value */}
            <td className={`border-l ${borderOrange} font-bold text-gray-900 font-mono text-[12px] p-0`}>
              <input
                type="text"
                value={workOrder.stationNumber || '0000'}
                onChange={(e) => handleFieldChange('stationNumber', e.target.value)}
                className={`${inputBaseClass} font-bold font-mono text-[12px]`}
                title="تعديل رقم المحطة مباشرة"
              />
            </td>

            {/* 3. Soil Label */}
            <td className={`border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              ترابية {'{NG}'}
            </td>

            {/* 4. Soil Length Value */}
            <td className={`border-l ${borderOrange} font-medium text-gray-900 font-mono p-0 relative`}>
              <input
                type="text"
                value={workOrder.soilLength || '0.00M'}
                onChange={(e) => handleFieldChange('soilLength', e.target.value)}
                className={`${inputBaseClass} font-mono text-amber-700 font-bold`}
                title="تعديل طول التربة الترابية مباشرة"
              />
            </td>

            {/* 5. Easting Label */}
            <td className={`border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              شرقيات
            </td>

            {/* 6. Easting Value */}
            <td className={`border-l ${borderOrange} font-mono font-medium text-gray-800 text-[11px] p-0`}>
              <input
                type="text"
                value={workOrder.easting || '0000000'}
                onChange={(e) => handleFieldChange('easting', e.target.value)}
                className={`${inputBaseClass} font-mono text-[11px]`}
                title="تعديل إحداثيات الشرقيات مباشرة"
              />
            </td>
          </tr>

          {/* Row 3 */}
          <tr className="h-7 text-center">
            {/* 1. District Label (Right side in RTL) */}
            <td className={`border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              المنطقه
            </td>

            {/* 2. District Value */}
            <td className={`border-l ${borderOrange} font-bold text-gray-900 p-0`}>
              <input
                type="text"
                value={workOrder.district || 'الحرازات'}
                onChange={(e) => handleFieldChange('district', e.target.value)}
                className={`${inputBaseClass} font-bold`}
                title="تعديل اسم المنطقة مباشرة"
              />
            </td>

            {/* 3. Tile Label */}
            <td className={`border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              بلاط {'{T}'}
            </td>

            {/* 4. Tile Length Value */}
            <td className={`border-l ${borderOrange} font-medium text-gray-900 font-mono p-0 relative`}>
              <input
                type="text"
                value={workOrder.tileLength || '0.00M'}
                onChange={(e) => handleFieldChange('tileLength', e.target.value)}
                className={`${inputBaseClass} font-mono text-emerald-700 font-bold`}
                title="تعديل طول البلاط مباشرة"
              />
            </td>

            {/* 5. Northing Label */}
            <td className={`border-l ${borderOrange} font-bold text-gray-800 bg-white`}>
              شماليات
            </td>

            {/* 6. Northing Value */}
            <td className={`border-l ${borderOrange} font-mono font-medium text-gray-800 text-[11px] p-0`}>
              <input
                type="text"
                value={workOrder.northing || '0000000'}
                onChange={(e) => handleFieldChange('northing', e.target.value)}
                className={`${inputBaseClass} font-mono text-[11px]`}
                title="تعديل إحداثيات الشماليات مباشرة"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Breakdown Row: Ordered from Right to Left matching SEC standard */}
      <table className="w-full border-collapse text-center">
        <thead>
          {/* Main Category Header Row */}
          <tr className={`h-6 border-b ${borderOrange}`}>
            {/* 1. تاريخ تسليم Value & Label Container (ColSpan 2 on the right) */}
            <th colSpan={2} className={`border-l ${borderOrange} p-0 border-collapse`}>
              <div className="flex h-full items-center">
                <span className="w-1/2 font-bold text-gray-800 text-[10px]">
                  تاريخ تسليم
                </span>
                <div className={`w-1/2 border-r ${borderOrange} font-mono font-medium text-gray-900 text-[10px] p-0`}>
                  <input
                    type="text"
                    value={workOrder.deliveryDate || '30/5/2026'}
                    onChange={(e) => handleFieldChange('deliveryDate', e.target.value)}
                    className={`${inputBaseClass} font-mono text-[10px]`}
                    title="تعديل تاريخ التسليم مباشرة"
                  />
                </div>
              </div>
            </th>

            {/* 2. نهاية (4 sub-columns) */}
            <th colSpan={4} className={`border-l ${borderOrange} font-bold text-gray-800`}>
              نهاية
            </th>

            {/* 3. لقز (4 sub-columns) */}
            <th colSpan={4} className={`border-l ${borderOrange} font-bold text-gray-800`}>
              لقز
            </th>

            {/* 4. محطة */}
            <th className={`border-l ${borderOrange} font-bold text-gray-800 w-[5%]`}>
              محطة
            </th>

            {/* 5. كيبل (4 sub-columns) */}
            <th colSpan={4} className={`border-l ${borderOrange} font-bold text-gray-800`}>
              كيبل
            </th>

            {/* 6. لحام (3 sub-columns on the left) */}
            <th colSpan={3} className={`font-bold text-gray-800`}>
              لحام
            </th>
          </tr>

          {/* Sub-header sizes row */}
          <tr className={`h-6 border-b ${borderOrange} text-[10px] text-gray-800 font-mono font-bold`}>
            {/* كيبل مؤقت Value & Label */}
            <th colSpan={2} className={`border-l ${borderOrange} p-0 border-collapse`}>
              <div className="flex h-full items-center">
                <span className="w-1/2 font-bold text-gray-800 text-[10px] font-['Cairo']">
                  كيبل مؤقت
                </span>
                <div className={`w-1/2 border-r ${borderOrange} font-mono font-medium text-gray-900 text-[10px] p-0`}>
                  <input
                    type="text"
                    value={workOrder.tempCable || '0000'}
                    onChange={(e) => handleFieldChange('tempCable', e.target.value)}
                    className={`${inputBaseClass} font-mono text-[10px]`}
                    title="تعديل كيبل مؤقت مباشرة"
                  />
                </div>
              </div>
            </th>

            {/* نهاية: 70, 185, 300, 500 */}
            <th className={`border-l ${borderOrange} w-[4.2%]`}>70</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>185</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>300</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>500</th>

            {/* لقز: 70, 185, 300, 500 */}
            <th className={`border-l ${borderOrange} w-[4.2%]`}>70</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>185</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>300</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>500</th>

            {/* محطة */}
            <th className={`border-l ${borderOrange} w-[5%]`}>محطة</th>

            {/* كيبل: 70, 185, 300, 500 */}
            <th className={`border-l ${borderOrange} w-[4.2%]`}>70</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>185</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>300</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>500</th>

            {/* لحام: 70, 300, 500 */}
            <th className={`border-l ${borderOrange} w-[4.2%]`}>70</th>
            <th className={`border-l ${borderOrange} w-[4.2%]`}>300</th>
            <th className={`w-[4.2%]`}>500</th>
          </tr>
        </thead>

        {/* Quantities Values Row */}
        <tbody>
          <tr className="h-6 font-mono font-bold text-[11px] text-gray-900">
            {/* Balance cells under Delivery Date & Temp Cable */}
            <td className={`border-l ${borderOrange} w-[9%]`}></td>
            <td className={`border-l ${borderOrange} w-[9%]`}></td>

            {/* نهاية values: 70, 185, 300, 500 */}
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.terminations.t70}
                onChange={(e) => handleNestedChange('terminations', 't70', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.terminations.t185}
                onChange={(e) => handleNestedChange('terminations', 't185', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.terminations.t300}
                onChange={(e) => handleNestedChange('terminations', 't300', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.terminations.t500}
                onChange={(e) => handleNestedChange('terminations', 't500', e.target.value)}
                className={inputBaseClass}
              />
            </td>

            {/* لقز values: 70, 185, 300, 500 */}
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.lugs.l70}
                onChange={(e) => handleNestedChange('lugs', 'l70', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.lugs.l185}
                onChange={(e) => handleNestedChange('lugs', 'l185', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.lugs.l300}
                onChange={(e) => handleNestedChange('lugs', 'l300', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.lugs.l500}
                onChange={(e) => handleNestedChange('lugs', 'l500', e.target.value)}
                className={inputBaseClass}
              />
            </td>

            {/* محطة value */}
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.stationCount}
                onChange={(e) => handleFieldChange('stationCount', e.target.value)}
                className={inputBaseClass}
              />
            </td>

            {/* كيبل values: 70, 185, 300, 500 */}
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.cables.c70}
                onChange={(e) => handleNestedChange('cables', 'c70', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.cables.c185}
                onChange={(e) => handleNestedChange('cables', 'c185', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.cables.c300}
                onChange={(e) => handleNestedChange('cables', 'c300', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.cables.c500}
                onChange={(e) => handleNestedChange('cables', 'c500', e.target.value)}
                className={inputBaseClass}
              />
            </td>

            {/* لحام values: 70, 300, 500 */}
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.welds.w70}
                onChange={(e) => handleNestedChange('welds', 'w70', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`border-l ${borderOrange} p-0`}>
              <input
                type="text"
                value={workOrder.welds.w300}
                onChange={(e) => handleNestedChange('welds', 'w300', e.target.value)}
                className={inputBaseClass}
              />
            </td>
            <td className={`p-0`}>
              <input
                type="text"
                value={workOrder.welds.w500}
                onChange={(e) => handleNestedChange('welds', 'w500', e.target.value)}
                className={inputBaseClass}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
