'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import styles from './menu.module.css';

export default function LigneMenu() {
  const router = useRouter();
  const { user } = useApp();
  const [activeLine, setActiveLine] = useState<string | null>(null);

  useEffect(() => {
    const savedLine = localStorage.getItem('bkfood-active-line');
    setActiveLine(savedLine);
  }, []);

  const lines = [
    { id: '1', name: 'Ligne 5/2 [1]', description: 'Ligne automatique 5/2' },
    { id: '2', name: 'Ligne 5/2 [2]', description: 'Ligne automatique 5/2' },
    { id: '3', name: 'Ligne 400', description: 'Ligne automatique 400' },
    { id: '4', name: 'Ligne 1/5', description: 'Ligne automatique 1/5' },
    { id: '5', name: 'Ligne Manuel', description: 'Ligne manuelle' },
  ];

  const menuCards = [
    { 
      title: 'Entrée Palette',
      icon: '📥', 
      href: '/ligne/entree-palette',
      gradient: 'var(--gradient-primary)'
    },
    { 
      title: 'Sortie Chariot', 
      icon: '🛒', 
      href: '/ligne/sortie-chariot',
      gradient: 'var(--gradient-primary)'
    },
    {
      title: 'Choix de Ligne', 
      description: activeLine ? `Ligne active: ${activeLine}` : '',
      icon: '⚙️', 
      href: '/ligne/choix-ligne',
      gradient: 'var(--gradient-success)'
    },
    {
      title: 'Historique', 
      icon: '📜', 
      href: '/ligne/historique',
      gradient: 'var(--gradient-primary)'
    },
    {
      title: 'Visuel',
      icon: '👁️',
      href: '/ligne/visuel',
      gradient: 'var(--gradient-primary)'
    },
  ];

  return (
    <div className={styles.container}>
      {/* Worker Information Header */}
      <div className={styles.header}>
        <div className={styles.workerInfo}>
          <h2>👋 Bienvenue, {user?.name || 'Opérateur'}</h2>
          {activeLine && (
            <div className={styles.activeLine}>
              <span className={styles.lineLabel}>Ligne Assignée:</span>
              <span className={styles.lineValue}>
                {activeLine}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Grid */}
      <div className={styles.grid}>
        {menuCards.map((card, index) => (
          <Link 
            key={index}
            href={card.href}
            className={styles.card} 
            style={{ '--grad': card.gradient } as React.CSSProperties}
          >
            <div className={styles.cardIcon}>{card.icon}</div>
            <div className={styles.cardContent}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <h4 style={{marginTop: '10px'}}>📋 Instructions:</h4>
        <ul style={{marginLeft: '20px',marginTop: '10px'}}>
          <li>Choisissez votre ligne de production en cliquant sur "Choix de Ligne"</li>
          <li>Une fois sélectionnée, vous êtes responsable de cette ligne</li>
          <li>Toutes vos opérations seront associées à votre matricule et votre ligne</li>
          <li>Vous pouvez changer de ligne à tout moment via le menu</li>
        </ul>
      </div>
    </div>
  );
}
