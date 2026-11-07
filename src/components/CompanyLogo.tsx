import React from 'react';

interface CompanyLogoProps {
  customLogoUrl?: string;
  companyNameAr?: string;
  companyNameEn?: string;
  companyCode?: string;
  className?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  customLogoUrl,
  companyNameAr = 'شركة الجوان المتطورة للمقاولات',
  companyNameEn = 'ADVANCED CO. LTD FOR CONTRACTING',
  companyCode = 'ALJUAN',
  className = '',
}) => {
  if (customLogoUrl) {
    return (
      <div className={`flex items-center justify-center p-1 ${className}`}>
        <img
          src={customLogoUrl}
          alt={companyCode || 'Company Logo'}
          className="max-h-14 max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between px-2 py-1 select-none ${className}`}>
      {/* Brand Text */}
      <div className="flex flex-col justify-center text-left">
        <span className="text-[17px] font-black tracking-wider text-[#0f3460] font-sans leading-none">
          {companyCode}
        </span>
        <span className="text-[6.5px] font-bold text-gray-400 uppercase tracking-tight scale-y-90 origin-left mt-0.5 font-sans">
          {companyNameEn}
        </span>
        <span className="text-[7.5px] font-bold text-orange-600 tracking-tight mt-[-1px] font-['Cairo']">
          {companyNameAr}
        </span>
      </div>

      {/* Stylized Excavator Shovel Icon in Orange */}
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center mr-1">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-[#ea7c15]"
          fill="currentColor"
        >
          {/* Excavator Arm and Bucket silhouette identical to ALJUAN brand */}
          <path d="M 12 70 L 40 70 L 34 58 L 22 58 Z" fill="#e57e20" />
          <path
            d="M 28 58 Q 36 28 62 26 L 68 34 Q 48 36 38 60 Z"
            fill="#e57e20"
          />
          <path
            d="M 60 26 Q 84 32 86 52 L 78 55 Q 76 38 56 34 Z"
            fill="#ea7c15"
          />
          <path
            d="M 86 52 L 72 78 L 56 78 L 74 54 Z"
            fill="#ea7c15"
          />
          {/* Bucket Teeth */}
          <polygon points="56,78 60,86 64,78 68,86 72,78" fill="#ea7c15" />
          {/* Hydraulic Joint Accent */}
          <circle cx="64" cy="30" r="4" fill="#ffffff" stroke="#ea7c15" strokeWidth="2" />
          <circle cx="78" cy="55" r="3.5" fill="#ffffff" stroke="#ea7c15" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
};
