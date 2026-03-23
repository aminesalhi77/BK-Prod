'use client';

import React from 'react';
import Link from 'next/link';
import styles from './menu.module.css';

export default function AutoclaveMenu() {
  const menuCards = [
    { 
      title: 'Chargement Autoclave', 
      description: 'Lancer un cycle de stérilisation (Multi-scan)', 
      icon: '📥', 
      href: '/autoclave/chargement',
      gradient: 'var(--gradient-primary)'
    },
    { 
      title: 'Fin de Cycle', 
      description: 'Valider la fin et imprimer le ticket STR', 
      icon: '🏁', 
      href: '/autoclave/fin-cycle',
      gradient: 'var(--gradient-success)'
    },
    { 
      title: 'Historique Cycles', 
      description: 'Voir les derniers cycles et anomalies', 
      icon: '📜', 
      href: '/autoclave/historique',
      gradient: 'var(--gradient-primary)'
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
