import { CanvasElement, SoilType, WorkOrderData } from '../types';

export const PIXELS_PER_METER = 25;

export interface LineLengthInfo {
  lengthMeters: number;
  lengthPixels: number;
  prefix: string;
  unit: string;
  rawLabel: string;
}

/**
 * Parses the length of a line element in meters.
 * Priority: parsed from label text if exists (e.g. "AS 6.00M" -> 6),
 * otherwise calculates geometric distance / PIXELS_PER_METER.
 */
export function getLineLengthInfo(element: CanvasElement): LineLengthInfo | null {
  if (element.type !== 'line' && element.type !== 'dimension') {
    return null;
  }
  if (element.x2 === undefined || element.y2 === undefined) {
    return null;
  }

  const dx = element.x2 - element.x;
  const dy = element.y2 - element.y;
  const geomPixels = Math.hypot(dx, dy);
  const geomMeters = geomPixels / PIXELS_PER_METER;

  let lengthMeters = geomMeters;
  let prefix = '';
  let unit = 'M';

  if (element.label) {
    // Extract prefix like "AS ", "NG", "T ", etc.
    const prefixMatch = element.label.match(/^([A-Za-z\s]+)/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
    } else if (element.soilType && element.soilType !== 'NONE') {
      prefix = element.soilType === 'NG' ? 'NG' : `${element.soilType} `;
    }

    const numMatch = element.label.match(/(\d+(\.\d+)?)/);
    if (numMatch) {
      lengthMeters = parseFloat(numMatch[1]);
    }
  } else if (element.soilType && element.soilType !== 'NONE') {
    prefix = element.soilType === 'NG' ? 'NG' : `${element.soilType} `;
  }

  return {
    lengthMeters: Math.round(lengthMeters * 100) / 100,
    lengthPixels: geomPixels,
    prefix,
    unit,
    rawLabel: element.label || '',
  };
}

/**
 * Formats a label for a line or cable based on soil type and meter length.
 */
export function formatLineLabel(
  meters: number,
  soilType?: SoilType,
  existingPrefix?: string
): string {
  let prefix = existingPrefix ?? '';
  if (!prefix && soilType && soilType !== 'NONE') {
    if (soilType === 'KASHT') {
      prefix = 'كشط ';
    } else if (soilType === 'NG') {
      prefix = 'NG';
    } else {
      prefix = `${soilType} `;
    }
  }

  const formattedNum = Number.isInteger(meters)
    ? `${meters}.0`
    : meters.toFixed(meters * 10 % 1 === 0 ? 1 : 2);

  return `${prefix}${formattedNum}M`.trim();
}

/**
 * Changes a line's length to targetMeters by stretching from anchor.
 * Also optionally shifts connected symbols located at the moving endpoint.
 */
export function resizeLineElement(
  elements: CanvasElement[],
  lineId: string,
  targetMeters: number,
  options?: {
    anchor?: 'start' | 'end' | 'center';
    updateLabel?: boolean;
    moveConnectedSymbols?: boolean;
  }
): CanvasElement[] {
  const line = elements.find((el) => el.id === lineId);
  if (!line || (line.type !== 'line' && line.type !== 'dimension')) {
    return elements;
  }
  if (line.x2 === undefined || line.y2 === undefined) {
    return elements;
  }

  const anchor = options?.anchor ?? 'start';
  const shouldUpdateLabel = options?.updateLabel ?? true;
  const shouldMoveConnected = options?.moveConnectedSymbols ?? true;

  const dx = line.x2 - line.x;
  const dy = line.y2 - line.y;
  const currentPixels = Math.hypot(dx, dy);

  // Direction unit vector (defaults to horizontal right if line length is 0)
  const ux = currentPixels > 0 ? dx / currentPixels : 1;
  const uy = currentPixels > 0 ? dy / currentPixels : 0;

  const targetPixels = Math.max(10, targetMeters * PIXELS_PER_METER);

  let newX1 = line.x;
  let newY1 = line.y;
  let newX2 = line.x2;
  let newY2 = line.y2;

  let movingOldPoint = { x: line.x2, y: line.y2 };
  let movingNewPoint = { x: line.x2, y: line.y2 };

  if (anchor === 'start') {
    // Start is fixed, end point (x2, y2) moves
    newX2 = Math.round(line.x + ux * targetPixels);
    newY2 = Math.round(line.y + uy * targetPixels);
    movingOldPoint = { x: line.x2, y: line.y2 };
    movingNewPoint = { x: newX2, y: newY2 };
  } else if (anchor === 'end') {
    // End is fixed, start point (x, y) moves backwards
    newX1 = Math.round(line.x2 - ux * targetPixels);
    newY1 = Math.round(line.y2 - uy * targetPixels);
    movingOldPoint = { x: line.x, y: line.y };
    movingNewPoint = { x: newX1, y: newY1 };
  } else {
    // Center is fixed, both ends expand equally
    const midX = (line.x + line.x2) / 2;
    const midY = (line.y + line.y2) / 2;
    const half = targetPixels / 2;
    newX1 = Math.round(midX - ux * half);
    newY1 = Math.round(midY - uy * half);
    newX2 = Math.round(midX + ux * half);
    newY2 = Math.round(midY + uy * half);
  }

  // Calculate shift delta for connected symbols
  const shiftDelta = {
    x: movingNewPoint.x - movingOldPoint.x,
    y: movingNewPoint.y - movingOldPoint.y,
  };

  const info = getLineLengthInfo(line);
  const newLabel = shouldUpdateLabel
    ? formatLineLabel(targetMeters, line.soilType, info?.prefix)
    : line.label;

  return elements.map((item) => {
    if (item.id === lineId) {
      return {
        ...item,
        x: newX1,
        y: newY1,
        x2: newX2,
        y2: newY2,
        label: newLabel,
      };
    }

    // Move connected symbols (e.g. SP circles, Substation boxes at the moving endpoint)
    if (
      shouldMoveConnected &&
      item.id !== lineId &&
      (item.type === 'symbol' || item.type === 'custom_symbol')
    ) {
      const distToMoving = Math.hypot(
        item.x - movingOldPoint.x,
        item.y - movingOldPoint.y
      );
      // If symbol is within 24 pixels of the moved endpoint
      if (distToMoving <= 24) {
        return {
          ...item,
          x: item.x + shiftDelta.x,
          y: item.y + shiftDelta.y,
        };
      }
    }

    return item;
  });
}

/**
 * Calculates total lengths across all lines in the canvas.
 */
export function calculateTotalsFromElements(elements: CanvasElement[]) {
  let totalAsphalt = 0;
  let totalSoil = 0;
  let totalTile = 0;

  elements.forEach((el) => {
    if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
      const info = getLineLengthInfo(el);
      const meters = info ? info.lengthMeters : 0;

      const soil = el.soilType || 'NONE';
      const labelUpper = (el.label || '').toUpperCase();

      if (soil === 'AS' || soil === 'KASHT' || el.isMilling || labelUpper.includes('AS') || labelUpper.includes('كشط')) {
        totalAsphalt += meters;
      } else if (soil === 'NG' || labelUpper.includes('NG')) {
        totalSoil += meters;
      } else if (soil === 'T' || labelUpper.includes('T')) {
        totalTile += meters;
      } else {
        // default to asphalt if unassigned or line
        totalAsphalt += meters;
      }
    }
  });

  const totalTrench = totalAsphalt + totalSoil + totalTile;

  return {
    totalTrench: Math.round(totalTrench * 100) / 100,
    totalAsphalt: Math.round(totalAsphalt * 100) / 100,
    totalSoil: Math.round(totalSoil * 100) / 100,
    totalTile: Math.round(totalTile * 100) / 100,
  };
}
