import { useState, useEffect, useRef, useCallback } from 'react';

interface ScannerOptions {
  onScan: (code: string) => void;
  minLength?: number;
  speedThreshold?: number; // ms between characters
}

export function useScannerInput({
  onScan,
  minLength = 8,
  speedThreshold = 50,
}: ScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const lastKeyTimeRef = useRef<number>(0);
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement> | KeyboardEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTimeRef.current;

    // If keypress is very fast, it's likely a scanner
    if (timeDiff < speedThreshold || bufferRef.current.length === 0) {
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          onScan(bufferRef.current);
          setScanned(true);
          setTimeout(() => setScanned(false), 2000);
          bufferRef.current = '';
          setIsScanning(false);
          if (navigator.vibrate) navigator.vibrate(60);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        setIsScanning(true);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setIsScanning(false);
          // If it was a slow human typing, we might want to clear or keep it
          // For now, let's keep it in the input field via normal onChange
        }, 500);
      }
    } else {
      // Human typing - reset buffer
      bufferRef.current = '';
      setIsScanning(false);
    }

    lastKeyTimeRef.current = currentTime;
  }, [onScan, minLength, speedThreshold]);

  // We can bind this to an input or use it globally
  const bindInput = {
    onKeyDown: handleKeyDown,
  };

  return {
    isScanning,
    scanned,
    bindInput,
    buffer: bufferRef.current,
  };
}
