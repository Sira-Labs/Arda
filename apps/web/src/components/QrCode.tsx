import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

/**
 * A QR code as SVG rectangles (no generated markup is injected): dark modules on the paper
 * colour with a quiet zone, readable by phone cameras in both themes.
 */
export function QrCode({
  value,
  label,
  size = 220,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const cells = useMemo(() => {
    const code = qrcode(0, 'M');
    code.addData(value);
    code.make();
    const count = code.getModuleCount();
    const dark: [number, number][] = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++)
        if (code.isDark(row, col)) dark.push([col, row]);
    }
    return { count, dark };
  }, [value]);
  const quiet = 4;
  const extent = cells.count + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className="qr"
    >
      <rect width={extent} height={extent} fill="#ffffff" />
      {cells.dark.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x + quiet}
          y={y + quiet}
          width={1}
          height={1}
          fill="#10201b"
        />
      ))}
    </svg>
  );
}
