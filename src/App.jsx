import { useState, Suspense, lazy } from 'react';
import LandingPage from './LandingPage';
import './App.css';

// Lazy load the heavy canvas/AI modules so they don't bloat the initial landing page bundle
const CameraFeed = lazy(() => import('./CameraFeed'));
const VideoDashboard = lazy(() => import('./VideoDashboard'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const ContactUs = lazy(() => import('./pages/ContactUs'));

const LoadingFallback = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#050505',
    color: '#00f5a0',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }}>
    Loading AI Modules...
  </div>
);

// Single nav button — hover styling lives in App.css (.app-nav-btn:hover) so it
// survives the cursor entering child <svg>/<span> nodes, unlike JS onMouseEnter.
function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-nav-btn ${active ? 'active' : ''}`}
    >
      {icon}
      <span className="nav-label">{label}</span>
    </button>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('home');

  if (activeTab === 'home') {
    return <LandingPage onStartAnalysis={() => setActiveTab('live')} onNavigate={setActiveTab} />;
  }
  if (activeTab === 'privacy') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PrivacyPolicy onNavigate={setActiveTab} />
      </Suspense>
    );
  }
  if (activeTab === 'terms') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TermsOfService onNavigate={setActiveTab} />
      </Suspense>
    );
  }
  if (activeTab === 'contact') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ContactUs onNavigate={setActiveTab} />
      </Suspense>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#050505',
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      color: '#f8fafc',
    }}>
      {/* Floating Glass Navigation Header */}
      <nav className="app-header" style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(11, 15, 25, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '18px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div 
          className="brand-text-container"
          onClick={() => setActiveTab('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <img 
            src="/favicon.svg" 
            alt="ShadowCoach Logo" 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              border: '1px solid rgba(0, 245, 160, 0.35)', 
              boxShadow: '0 0 12px rgba(0, 245, 160, 0.25)',
              objectFit: 'contain',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px' 
            }} 
          />
          <span style={{ 
            fontWeight: 900, 
            fontSize: 'clamp(1.1rem, 3.5vw, 1.3rem)', 
            letterSpacing: '1px', 
            background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4px'
          }}>
            SHADOWCOACH <span style={{ color: '#00f5a0', WebkitTextFillColor: 'initial', fontWeight: 900 }}>// BIOTECH.AI</span>
          </span>
        </div>
        
        <div className="top-nav-wrapper">
          <div className="top-nav-buttons">
            <NavButton
              active={false}
              onClick={() => setActiveTab('home')}
              label="HOME"
              icon={<svg className="nav-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>}
            />
            <NavButton
              active={activeTab === 'live'}
              onClick={() => setActiveTab('live')}
              label="LIVE TELEMETRY"
              icon={<svg className="nav-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>}
            />
            <NavButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              label="VIDEO DASHBOARD"
              icon={<svg className="nav-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>}
            />
          </div>
        </div>
      </nav>

      {/* Cyberpunk Sports Telemetry Hero Banner */}
      <header className="hero-banner" style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 0 16px',
        borderBottom: '1px solid rgba(0, 245, 160, 0.06)'
      }}>
        {/* Stadium backdrop */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/stadium-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 43%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          filter: 'hue-rotate(180deg) contrast(1.25) brightness(0.75)',
        }} />
        
        {/* Shading gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 15, 25, 0.92) 80%, #0b0f19 100%)',
        }} />
        
        <h1 style={{
          fontFamily: "'Chakra Petch', 'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 'clamp(1.5rem, 5vw, 2.4rem)',
          fontWeight: 900,
          textTransform: 'uppercase',
          margin: 0,
          position: 'relative',
          zIndex: 2,
          letterSpacing: '2px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          Cricket Shadow Coach
        </h1>
        <p className="hero-subtitle" style={{
          color: '#cbd5e1',
          fontSize: 'clamp(0.78rem, 3vw, 0.9rem)',
          marginTop: '6px',
          fontWeight: 600,
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '680px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Stand in front of your camera and play a shot. The AI will analyse your technique in real time.
        </p>
        
        <div style={{
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, #00f5a0, #00e5ff)',
          marginTop: '10px',
          borderRadius: '10px',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 0 10px rgba(0, 245, 160, 0.4)',
        }} />
      </header>

      {/* Main Grid Dashboard */}
      <main className="main-content" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px' }}>
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'live' ? <CameraFeed /> : <VideoDashboard />}
        </Suspense>
      </main>

      {/* Enhanced Trust & Branding Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'rgba(11, 15, 25, 0.95)',
        color: '#94a3b8',
        fontSize: '0.85rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#00f5a0',
          fontWeight: 600,
          background: 'rgba(0, 245, 160, 0.08)',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(0, 245, 160, 0.2)'
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
          <span>Camera data is processed locally — never uploaded</span>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
          <button type="button" className="footer-link-btn" onClick={() => setActiveTab('privacy')}>Privacy Policy</button>
          <span style={{ color: '#475569' }}>|</span>
          <button type="button" className="footer-link-btn" onClick={() => setActiveTab('contact')}>Contact & Feedback</button>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#64748b' }}>App Version 1.1.0</span>
        </div>

        <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
          <span>Engineered by </span>
          <span style={{ color: '#f8fafc', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>BILAL HASAN</span>
          <span style={{ margin: '0 10px', opacity: 0.3 }}>|</span>
          <span>© 2026 Sports Biomechanics Laboratory</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
