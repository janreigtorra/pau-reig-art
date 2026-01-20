import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Disable browser scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Scroll window to top
    window.scrollTo(0, 0);
    
    // Also scroll document element and body (in case one of them is the scroll container)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Also try to find and scroll any main content container
    const root = document.getElementById('root');
    if (root) {
      root.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}

