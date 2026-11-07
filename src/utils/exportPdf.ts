import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Robust PDF export function that captures the engineering sheet
 * and triggers a reliable file download onto the user's local device.
 */
export const exportToPdf = async (
  elementId: string,
  filename = 'كروكي-مساحي.pdf'
): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  // Find parent element that might have zoom scaling applied
  const parentWithTransform = element.parentElement;
  let originalTransform = '';
  let originalTransition = '';

  try {
    // Temporarily reset CSS transform on parent to ensure 100% pixel-perfect capture
    if (parentWithTransform) {
      originalTransform = parentWithTransform.style.transform;
      originalTransition = parentWithTransform.style.transition;
      parentWithTransform.style.transition = 'none';
      parentWithTransform.style.transform = 'none';
    }

    // Brief timeout to let layout settle without scale
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Render high-res canvas at scale 2 for crisp lines and typography without memory overflow
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Standard A4 portrait size: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 4mm margin on all sides for neat engineering frame
    const margin = 4;
    const printWidth = pdfWidth - margin * 2;
    const printHeight = pdfHeight - margin * 2;

    // Calculate proportional fit to never cut off or distort header/footer
    const imgRatio = canvas.width / canvas.height;
    const pageRatio = printWidth / printHeight;
    let finalW = printWidth;
    let finalH = printHeight;

    if (imgRatio > pageRatio) {
      finalH = printWidth / imgRatio;
    } else {
      finalW = printHeight * imgRatio;
    }

    const posX = margin + (printWidth - finalW) / 2;
    const posY = margin + (printHeight - finalH) / 2;

    pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH, undefined, 'FAST');

    // Direct Blob download approach to guarantee browser saves file to device
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    // Fallback: trigger standard browser print dialog which allows "Save as PDF"
    window.print();
    return false;
  } finally {
    // Restore parent zoom transform
    if (parentWithTransform) {
      parentWithTransform.style.transform = originalTransform;
      parentWithTransform.style.transition = originalTransition;
    }
  }
};

export const exportToPng = async (
  elementId: string,
  filename = 'كروكي-مساحي.png'
): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const parentWithTransform = element.parentElement;
  let originalTransform = '';
  let originalTransition = '';

  try {
    if (parentWithTransform) {
      originalTransform = parentWithTransform.style.transform;
      originalTransition = parentWithTransform.style.transition;
      parentWithTransform.style.transition = 'none';
      parentWithTransform.style.transform = 'none';
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const blobUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);

    return true;
  } catch (error) {
    console.error('Failed to export PNG:', error);
    return false;
  } finally {
    if (parentWithTransform) {
      parentWithTransform.style.transform = originalTransform;
      parentWithTransform.style.transition = originalTransition;
    }
  }
};

/**
 * Capture the engineering sheet directly as a binary Blob (PNG image or PDF)
 * suitable for uploading to Google Drive without downloading to disk first.
 */
export const captureSheetAsBlob = async (
  elementId: string,
  format: 'png' | 'pdf' = 'png'
): Promise<Blob> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`تعذر العثور على العنصر ${elementId}`);
  }

  const parentWithTransform = element.parentElement;
  let originalTransform = '';
  let originalTransition = '';

  try {
    if (parentWithTransform) {
      originalTransform = parentWithTransform.style.transform;
      originalTransition = parentWithTransform.style.transition;
      parentWithTransform.style.transition = 'none';
      parentWithTransform.style.transform = 'none';
    }

    await new Promise((resolve) => setTimeout(resolve, 60));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    });

    if (format === 'png') {
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('فشل إنشاء ملف الصورة PNG'));
        }, 'image/png');
      });
    } else {
      // PDF format
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const printWidth = pdfWidth - margin * 2;
      const printHeight = pdfHeight - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      const pageRatio = printWidth / printHeight;
      let finalW = printWidth;
      let finalH = printHeight;

      if (imgRatio > pageRatio) {
        finalH = printWidth / imgRatio;
      } else {
        finalW = printHeight * imgRatio;
      }

      const posX = margin + (printWidth - finalW) / 2;
      const posY = margin + (printHeight - finalH) / 2;

      pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH, undefined, 'FAST');
      return pdf.output('blob');
    }
  } finally {
    if (parentWithTransform) {
      parentWithTransform.style.transform = originalTransform;
      parentWithTransform.style.transition = originalTransition;
    }
  }
};

