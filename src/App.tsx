import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';

import Inici from './pages/Inici';
import LArtista from './pages/LArtista';
import LObra from './pages/LObra';
import ObraDetail from './pages/ObraDetail';
import ElTaller from './pages/ElTaller';
import Media from './pages/Media';
import ScrollToTop from './components/ScrollToTop';
import logoUrl from '../logo/logo_main.png';

type Language = 'catala' | 'english';

export const LanguageContext = React.createContext<{ language: Language; setLanguage: (l: Language) => void }>({ language: 'catala', setLanguage: () => {} });

export const ModalContext = React.createContext<{ isModalOpen: boolean; setIsModalOpen: (open: boolean) => void }>({ isModalOpen: false, setIsModalOpen: () => {} });

export default function App() {
  const [language, setLanguage] = useState<Language>('catala');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const langCtx = useMemo(() => ({ language, setLanguage }), [language]);
  const modalCtx = useMemo(() => ({ isModalOpen, setIsModalOpen }), [isModalOpen]);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track scroll on all pages for header shrinking (desktop only)
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setIsScrolled(scrollTop > 20);
    };
    
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <LanguageContext.Provider value={langCtx}>
      <ModalContext.Provider value={modalCtx}>
        <ScrollToTop />
        <nav 
          className={`nav ${isHome ? (isScrolled ? 'nav-home scrolled' : 'nav-home top') : 'nav-solid'} ${isModalOpen ? 'compact' : ''}`}
          style={!isMobile ? { 
            height: isScrolled ? '95px' : '152px',
            transition: 'all 0.3s ease'
          } : undefined}
        >
          <div 
            className="nav-inner" 
            style={!isMobile ? { 
              padding: isScrolled ? '12px 72px 14px 72px' : '20px 72px 30px 72px',
              transition: 'all 0.3s ease'
            } : undefined}
          >
            <div className="brand">
              <img 
                src={logoUrl} 
                alt="Pau Reig - Art" 
                style={!isMobile ? { 
                  height: isScrolled ? '70px' : '104px',
                  transition: 'all 0.3s ease'
                } : undefined}
              />
            </div>
            <div className="spacer" />
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
              {language === 'catala' ? 'Inici' : 'Home'}
            </NavLink>
            <NavLink to="/artista" className={({ isActive }) => (isActive ? 'active' : '')}>
              {language === 'catala' ? 'L\'Artista' : 'The Artist'}
            </NavLink>
            <NavLink to="/obra" className={({ isActive }) => (isActive ? 'active' : '')}>
              {language === 'catala' ? 'L\'Obra' : 'The Work'}
            </NavLink>
            <NavLink to="/taller" className={({ isActive }) => (isActive ? 'active' : '')}>
              {language === 'catala' ? 'El Taller' : 'The Workshop'}
            </NavLink>
            <NavLink to="/media" className={({ isActive }) => (isActive ? 'active' : '')}>
              {language === 'catala' ? 'Media' : 'Media'}
            </NavLink>
            <div className="lang-toggle" role="group" aria-label="Language toggle">
              <button className={language === 'catala' ? 'active' : ''} onClick={() => setLanguage('catala')}>CAT</button>
              <button className={language === 'english' ? 'active' : ''} onClick={() => setLanguage('english')}>EN</button>
            </div>
            <button 
              className="mobile-menu-toggle" 
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-content">
            <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'catala' ? 'Inici' : 'Home'}
            </NavLink>
            <NavLink to="/artista" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'catala' ? 'L\'Artista' : 'The Artist'}
            </NavLink>
            <NavLink to="/obra" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'catala' ? 'L\'Obra' : 'The Work'}
            </NavLink>
            <NavLink to="/taller" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'catala' ? 'El Taller' : 'The Workshop'}
            </NavLink>
            <NavLink to="/media" onClick={() => setIsMobileMenuOpen(false)}>
              {language === 'catala' ? 'Media' : 'Media'}
            </NavLink>
          </div>
        </div>

        <div className={`routes ${isHome ? 'routes-home' : 'routes-default'} ${isModalOpen ? 'compact' : ''}`}>
          <Routes>
            <Route path="/" element={<Inici />} />
            <Route path="/artista" element={<LArtista />} />
            <Route path="/obra" element={<LObra />} />
            <Route path="/obra/:slug" element={<ObraDetail />} />
            <Route path="/taller" element={<ElTaller />} />
            <Route path="/media" element={<Media />} />
          </Routes>
        </div>
        <footer className="footer">
          <div className="container">© {new Date().getFullYear()} Pau Reig – Art</div>
        </footer>
      </ModalContext.Provider>
    </LanguageContext.Provider>
  );
}

