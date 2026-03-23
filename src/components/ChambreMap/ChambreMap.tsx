'use client';

import React from 'react';
import styles from './ChambreMap.module.css';

interface PaletteData {
    id: string;
    code: string;
    longeType: string;
    entryTime: string;
    positionNumber: number;
    positionZone: string;
}

interface ChambreMapProps {
    palettes: PaletteData[];
    onPositionSelect?: (posNum: number, posZone: string) => void;
    selectedPosition?: { num: number; zone: string };
    mode?: 'view' | 'select';
}

const ZONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function ChambreMap({ palettes, onPositionSelect, selectedPosition, mode = 'view' }: ChambreMapProps) {
    
    const getPaletteAt = (num: number, zone: string) => {
        return palettes.find(p => p.positionNumber === num && p.positionZone === zone);
    };

    const isAlert = (palette: PaletteData) => {
        const entry = new Date(palette.entryTime).getTime();
        const now = Date.now();
        return (now - entry) > (8 * 60 * 60 * 1000); // 8 hours
    };

    const renderPosition = (num: number, zone: string) => {
        const palette = getPaletteAt(num, zone);
        const isSelected = selectedPosition?.num === num && selectedPosition?.zone === zone;
        const alert = palette && isAlert(palette);
        
        // In select mode, allow selecting any position (including occupied ones for stacking)
        const isSelectable = mode === 'select';

        return (
            <div 
                key={`${zone}${num}`}
                className={`
                    ${styles.position} 
                    ${palette ? styles.occupied : styles.empty} 
                    ${isSelected ? styles.selected : ''}
                    ${alert ? styles.alert : ''}
                    ${isSelectable ? styles.selectable : ''}
                `}
                onClick={() => onPositionSelect?.(num, zone)}
            >
                <div className={styles.posLabel}>{zone}{num}</div>
                {palette && (
                    <div className={styles.paletteInfo}>
                        <span className={styles.code}>{palette.code}</span>
                        <span className={styles.type}>{palette.longeType}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.chambreWrapper}>
            <div className={styles.door}>PORTE</div>
            
            <div className={styles.grid}>
                {/* Left Side (Cols 2 and 1) */}
                <div className={styles.side}>
                    <div className={styles.column}>
                        {ZONES.map((z, i) => renderPosition(i + 10, z))}
                    </div>
                    <div className={styles.column}>
                        {ZONES.map((z, i) => renderPosition(i + 1, z))}
                    </div>
                </div>

                {/* Corridor - Add positions for each zone */}
                <div className={styles.corridor}>
                    {ZONES.map(z => {
                        // Corridor positions use zone letter + position 0
                        const palette = getPaletteAt(0, z);
                        return (
                            <div 
                                key={z} 
                                className={`
                                    ${styles.position} 
                                    ${palette ? styles.occupied : styles.empty} 
                                    ${mode === 'select' ? styles.selectable : ''}
                                `}
                                onClick={() => onPositionSelect?.(0, z)}
                            >
                                <div className={styles.posLabel}>{z}</div>
                                {palette && (
                                    <div className={styles.paletteInfo}>
                                        <span className={styles.code}>{palette.code}</span>
                                        <span className={styles.type}>{palette.longeType}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right Side (Cols 1 and 2) */}
                <div className={styles.side}>
                    <div className={styles.column}>
                        {ZONES.map((z, i) => renderPosition(i + 19, z))}
                    </div>
                    <div className={styles.column}>
                        {ZONES.map((z, i) => renderPosition(i + 28, z))}
                    </div>
                </div>
            </div>
        </div>
    );
}
