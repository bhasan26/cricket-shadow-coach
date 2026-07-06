import { useState, useEffect } from 'react';

export default function LegalNav({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`courto-nav ${scrolled ? 'scrolled' : ''}`} style={{ background: scrolled ? 'var(--bg-glass-heavy)' : 'var(--bg-surface)' }}>
      <div className="nav-container">
        <div className="nav-logo" style={{ color: '#111111', cursor: 'pointer' }} onClick={() => { window.scrollTo(0,0); if (onNavigate) onNavigate('home'); }}>
          CRICKET<span>COACH</span>
        </div>
        <div className="nav-actions">
          <button className="courto-btn courto-btn-outline" onClick={() => onNavigate('home')} style={{ borderColor: '#111111', color: '#111111' }}>
            BACK TO HOME
          </button>
        </div>
      </div>
    </nav>
  );
}
