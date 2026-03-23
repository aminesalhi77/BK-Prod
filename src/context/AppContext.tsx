'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
export type Theme = 'light' | 'dark';
export type Language = 'fr' | 'ar';
export type UserRole = 'WORKER' | 'RESPONSABLE_CONDITIONNEMENT' | 'ADMIN_PRODUCTION' | 'SUPER_ADMIN_IT' | 'ADMIN' | 'SUPER_ADMIN' | 'CHEF_LIGNE' | 'CHEFFE_TAPIS';
export type ModuleType = 'CHAMBRE' | 'LIGNE' | 'AUTOCLAVE' | 'EMBALLAGE' | 'ADMIN';

export interface AppUser {
  id: string;
  matricule: string;
  email?: string | null;
  name: string;
  role: UserRole;
  isApproved: boolean;
  assignedModule?: ModuleType | null;
}

export interface OfflineEntry {
  id: string;
  module: ModuleType;
  action: string;
  data: any;
  timestamp: string;
  retries: number;
}

export interface ChambreShift {
  id: string;
  operatorMatricule: string;
  chefTapis1: string;
  chefTapis2: string;
  chefTapis3: string;
  chefTapis4: string;
}

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  isRTL: boolean;
  toggleLanguage: () => void;
  t: (key: string) => string;
  user: AppUser | null;
  token: string | null;
  login: (user: AppUser, token: string) => void;
  logout: () => void;
  isOnline: boolean;
  offlineQueue: OfflineEntry[];
  addToOfflineQueue: (entry: Omit<OfflineEntry, 'id' | 'retries'>) => void;
  clearOfflineQueue: () => void;
  syncOfflineQueue: () => Promise<void>;
  isHydrated: boolean;
  activeShift: ChambreShift | null;
  startShift: (shift: ChambreShift) => void;
  endShift: () => void;
}

// ── Translations ───────────────────────────────────────────────────────
const translations: Record<Language, Record<string, string>> = {
  fr: {
    matricule: 'Matricule',
    password: 'Mot de passe',
    login: 'Connexion',
    logout: 'Déconnexion',
    submit: 'Valider',
    cancel: 'Annuler',
    save: 'Enregistrer',
    scan_barcode: 'Scanner le code-barres',
    chambre_title: 'Chambre 0',
    ligne_title: 'Production Ligne',
    autoclave_title: 'Autoclave',
    emballage_title: 'Emballage',
    admin_title: 'Administration',
    role_worker: 'Opérateur',
    role_resp_cond: 'Resp. Conditionnement',
    role_admin_prod: 'Admin Production',
    role_super_admin: 'Super Admin IT',
    entree_palette: 'Entrée Palette',
    sortie_palette: 'Sortie Palette',
    visuel: 'Visuel',
    indicateurs: 'Indicateurs',
    choix_ligne: 'Choix Ligne',
    sortie_chariot: 'Sortie Chariot',
    chargement: 'Chargement',
    fin_cycle: 'Fin de Cycle',
    demarrage: 'Démarrage',
    tracabilite: 'Traçabilité',
    scan_success: '✓ Code détecté',
    offline_saved: '💾 Sauvegardé hors-ligne',
    anomaly_detected: '⚠ Anomalie détectée',
    verification_required: 'Vérification requise',
  },
  ar: {
    matricule: 'الرقم الوظيفي',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    submit: 'تأكيد',
    cancel: 'إلغاء',
    save: 'حفظ',
    scan_barcode: 'مسح الرمز الشريطي',
    chambre_title: 'غرفة التبريد 0',
    ligne_title: 'خط الإنتاج',
    autoclave_title: 'التعقيم',
    emballage_title: 'التغليف',
    admin_title: 'الإدارة',
    role_worker: 'عامل إنتاج',
    role_resp_cond: 'مسؤول التعبئة',
    role_admin_prod: 'مدير الإنتاج',
    role_super_admin: 'مسؤول النظام',
    entree_palette: 'دخول لوحة',
    sortie_palette: 'خروج لوحة',
    visuel: 'بصري',
    indicateurs: 'مؤشرات',
    choix_ligne: 'اختيار الخط',
    sortie_chariot: 'خروج عربة',
    chargement: 'تحميل',
    fin_cycle: 'نهاية الدورة',
    demarrage: 'بدء',
    tracabilite: 'تتبع',
    scan_success: '✓ تم اكتشاف الرمز',
    offline_saved: '💾 تم الحفظ بلا اتصال',
    anomaly_detected: '⚠ تم اكتشاف شذوذ',
    verification_required: 'التحقق مطلوب',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  theme: 'bkfood-theme',
  language: 'bkfood-lang',
  user: 'bkfood-user',
  token: 'bkfood-token',
  offlineQueue: 'bkfood-offline-queue',
  activeShift: 'bkfood-chambre-shift',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<Language>('fr');
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEntry[]>([]);
  const [activeShift, setActiveShift] = useState<ChambreShift | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Initial Hydration from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null;
    const savedLang = localStorage.getItem(STORAGE_KEYS.language) as Language | null;
    const savedUser = localStorage.getItem(STORAGE_KEYS.user);
    const savedToken = localStorage.getItem(STORAGE_KEYS.token);
    const savedQueue = localStorage.getItem(STORAGE_KEYS.offlineQueue);
    const savedShift = localStorage.getItem(STORAGE_KEYS.activeShift);

    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLanguage(savedLang);
    if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch {} }
    if (savedToken) setToken(savedToken);
    if (savedQueue) { try { setOfflineQueue(JSON.parse(savedQueue)); } catch {} }
    if (savedShift) { try { setActiveShift(JSON.parse(savedShift)); } catch {} }
    
    setIsHydrated(true);
  }, []);

  // 2. Sync theme + language to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem(STORAGE_KEYS.language, language);
  }, [language]);

  // 3. Connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleTheme = useCallback(() => setTheme(p => p === 'light' ? 'dark' : 'light'), []);
  const toggleLanguage = useCallback(() => setLanguage(p => p === 'fr' ? 'ar' : 'fr'), []);
  const t = useCallback((key: string) => translations[language][key] ?? key, [language]);

  const login = useCallback((newUser: AppUser, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEYS.token, newToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setActiveShift(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.activeShift);
    document.cookie = 'bkfood-token=; Max-Age=0; path=/;';
    window.location.href = '/';
  }, []);

  const addToOfflineQueue = useCallback((entry: Omit<OfflineEntry, 'id' | 'retries'>) => {
    setOfflineQueue(prev => {
      const updated = [...prev, { ...entry, id: `off_${Date.now()}`, retries: 0 }];
      localStorage.setItem(STORAGE_KEYS.offlineQueue, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearOfflineQueue = useCallback(() => {
    setOfflineQueue([]);
    localStorage.removeItem(STORAGE_KEYS.offlineQueue);
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (!isOnline || offlineQueue.length === 0) return;
    setOfflineQueue([]);
    localStorage.removeItem(STORAGE_KEYS.offlineQueue);
  }, [isOnline, offlineQueue]);

  const startShift = useCallback((shift: ChambreShift) => {
    setActiveShift(shift);
    localStorage.setItem(STORAGE_KEYS.activeShift, JSON.stringify(shift));
  }, []);

  const endShift = useCallback(() => {
    setActiveShift(null);
    localStorage.removeItem(STORAGE_KEYS.activeShift);
  }, []);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      language, isRTL: language === 'ar', toggleLanguage, t,
      user, token, login, logout,
      isOnline, offlineQueue, addToOfflineQueue, clearOfflineQueue, syncOfflineQueue,
      isHydrated, activeShift, startShift, endShift
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
