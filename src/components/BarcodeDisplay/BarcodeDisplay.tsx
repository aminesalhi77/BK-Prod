'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeDisplay({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (svgRef.current && value) {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 4
      });
    }
  }, [value]);
  
  return <svg ref={svgRef} />;
}