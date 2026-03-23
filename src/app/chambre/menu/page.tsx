'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './menu.module.css';
import { title } from 'process';

export default function ChambreMenu() {
  const router = useRouter();

  const menuCards = [
    { 
      title: '🔵 Bouton 1 — Entrée palette depuis parage', 
      description: 'Réceptionner une palette depuis le Parage', 
      icon: '📥', 
      href: '/chambre/entree-palette',
      gradient: 'var(--gradient-primary)'
    },
    { 
      title: '🟢 Bouton 2 — Sortie palette vers ligne', 
      description: 'Sortir une palette vers les Lignes', 
      icon: '📤', 
      href: '/chambre/sortie-palette',
      gradient: 'var(--gradient-success)'
    },
    { 
      title: '🟡 Bouton 3 — Chambre 0 visuel', 
      description: 'Vue en temps réel du stock froid', 
      icon: '👁️',
      href: '/chambre/visuel',
      gradient: 'var(--gradient-warning)'
    },
    {
      title: '🔴 Bouton 4 — Chambre 0 historique',
      description: 'Historique des palettes sorties',
      icon: '📜',
      href: '/chambre/historique',
      gradient: 'var(--gradient-danger)'
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {menuCards.map((card) => (
          <Link key={card.href} href={card.href} className={styles.card} style={{ '--grad': card.gradient } as React.CSSProperties}>
            <div className={styles.cardIcon}>{card.icon}</div>
            <div className={styles.cardContent}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            <div className={styles.cardArrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
