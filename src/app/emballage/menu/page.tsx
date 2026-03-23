'use client';

import React from 'react';
import Link from 'next/link';
import styles from './menu.module.css';

export default function EmballageMenu() {
  const menuCards = [
    { 
      title: 'Saisie Emballage', 
      description: 'Scanner un ticket STR et enregistrer la production', 
      icon: '📦', 
      href: '/emballage/saisie',
      gradient: 'var(--gradient-primary)'
    },
    { 
      title: 'Historique Emballage', 
      description: 'Consulter et corriger les derniers lots', 
      icon: '📜', 
      href: '/emballage/historique',
      gradient: 'var(--gradient-primary)'
    },
    { 
      title: 'Vue Traçabilité', 
      description: 'Consulter la généalogie complète d\'un lot', 
      icon: '🔍', 
      href: '/emballage/tracabilite',
      gradient: 'var(--gradient-success)'
    }
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
          </Link>
        ))}
      </div>
    </div>
  );
}
