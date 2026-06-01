import React, { useState } from 'react';
import CameraFeed from './CameraFeed';
import VideoDashboard from './VideoDashboard';
import LandingPage from './LandingPage';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  if (activeTab === 'home') {
    return <LandingPage onStartAnalysis={() => setActiveTab('live')} />;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'transparent',
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
            src="/logo.png" 
            alt="Biotech AI Logo" 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              border: '1px solid rgba(0, 245, 160, 0.35)', 
              boxShadow: '0 0 12px rgba(0, 245, 160, 0.25)' 
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
          <div className="top-nav-buttons" style={{
            display: 'flex',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <button 
              onClick={() => setActiveTab('home')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              HOME
            </button>
            <button 
              onClick={() => setActiveTab('live')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: activeTab === 'live' ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === 'live' ? '#00f5a0' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>
              LIVE TELEMETRY
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: activeTab === 'dashboard' ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === 'dashboard' ? '#00f5a0' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
              VIDEO DASHBOARD
            </button>
          </div>
        </div>
      </nav>

      {/* Cyberpunk Sports Telemetry Hero Banner */}
      <header style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '144px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 20px',
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
          filter: 'blue-shift contrast(1.25) brightness(0.75)',
        }} />
        
        {/* Shading gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 15, 25, 0.92) 80%, #0b0f19 100%)',
        }} />
        
        {/* Tactical Biotech Coordinator Badge */}
        <span style={{ 
          color: '#00f5a0', 
          fontSize: 'clamp(0.55rem, 2vw, 0.68rem)', 
          fontWeight: 900, 
          letterSpacing: '2px', 
          textTransform: 'uppercase', 
          marginBottom: '8px', 
          zIndex: 2, 
          opacity: 0.85,
          textAlign: 'center',
          fontFamily: "'Chakra Petch', 'JetBrains Mono', monospace",
          textShadow: '0 0 10px rgba(0, 245, 160, 0.3)'
        }}>
          [ BIOMETRIC SYSTEM CALIBRATION // APEX LIVE CORE v1.1 ]
        </span>
        
        <h1 style={{
          fontFamily: "'Chakra Petch', 'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 'clamp(1.8rem, 7vw, 3.2rem)',
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
        <p style={{
          color: '#cbd5e1',
          fontSize: 'clamp(0.85rem, 3.5vw, 1rem)',
          marginTop: '10px',
          fontWeight: 600,
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '680px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Stand in front of your camera and play a shot — the AI will analyse your technique in real time.
        </p>
        
        <div style={{
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, #00f5a0, #00e5ff)',
          marginTop: '12px',
          borderRadius: '10px',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 0 10px rgba(0, 245, 160, 0.4)',
        }} />
      </header>

      {/* Main Grid Dashboard */}
      <main className="main-content" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'live' ? <CameraFeed /> : <VideoDashboard />}
      </main>

      {/* Symmetrical Lab Branding Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'rgba(11, 15, 25, 0.85)',
        color: '#475569',
        fontSize: '0.8rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        letterSpacing: '0.5px'
      }}>
        <span>Engineered by </span>
        <span style={{
          color: '#f8fafc',
          fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.88rem',
          letterSpacing: '1px'
        }}>BILAL HASAN</span>
        <span style={{ margin: '0 14px', opacity: 0.15 }}>|</span>
        <span>© 2026 Sports Biomechanics Laboratory // SHADOWCOACH</span>
      </footer>
    </div>
  );
}

export default App;
