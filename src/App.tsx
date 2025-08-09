import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';

import Inici from './pages/Inici';
import LArtista from './pages/LArtista';
import LObra from './pages/LObra';
import ElTaller from './pages/ElTaller';
import logoUrl from '../logo/logo_main.png';

type Language = 'catala' | 'english';

export const LanguageContext = React.createContext<{ language: Language; setLanguage: (l: Language) => void }>({ language: 'catala', setLanguage: () => {} });

export const ModalContext = React.createContext<{ isModalOpen: boolean; setIsModalOpen: (open: boolean) => void }>({ isModalOpen: false, setIsModalOpen: () => {} });

export default function App() {
  const [language, setLanguage] = useState<Language>('catala');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const langCtx = useMemo(() => ({ language, setLanguage }), [language]);
  const modalCtx = useMemo(() => ({ isModalOpen, setIsModalOpen }), [isModalOpen]);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(false);
      return;
    }

    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  return (
    <LanguageContext.Provider value={langCtx}>
      <ModalContext.Provider value={modalCtx}>
        <nav className={`nav ${isHome ? (isScrolled ? 'nav-home scrolled' : 'nav-home top') : 'nav-solid'} ${isModalOpen ? 'compact' : ''}`}>
          <div className="nav-inner">
            <div className="brand">
              <img src={logoUrl} alt="Pau Reig - Art" />
            </div>
            <div className="spacer" />
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>Inici</NavLink>
            <NavLink to="/artista" className={({ isActive }) => (isActive ? 'active' : '')}>L'Artista</NavLink>
            <NavLink to="/obra" className={({ isActive }) => (isActive ? 'active' : '')}>L'Obra</NavLink>
            <NavLink to="/taller" className={({ isActive }) => (isActive ? 'active' : '')}>El Taller</NavLink>
            <div className="lang-toggle" role="group" aria-label="Language toggle">
              <button className={language === 'catala' ? 'active' : ''} onClick={() => setLanguage('catala')}>CAT</button>
              <button className={language === 'english' ? 'active' : ''} onClick={() => setLanguage('english')}>EN</button>
            </div>
          </div>
        </nav>
        <div className={`routes ${isHome ? 'routes-home' : 'routes-default'} ${isModalOpen ? 'compact' : ''}`}>
          <Routes>
            <Route path="/" element={<Inici />} />
            <Route path="/artista" element={<LArtista />} />
            <Route path="/obra" element={<LObra />} />
            <Route path="/taller" element={<ElTaller />} />
          </Routes>
        </div>
        <footer className="footer">
          <div className="container">© {new Date().getFullYear()} Pau Reig – Art</div>
        </footer>
      </ModalContext.Provider>
    </LanguageContext.Provider>
  );
}

