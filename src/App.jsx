import React from 'react';
import CameraFeed from './CameraFeed';
import './App.css';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'transparent',
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      color: '#f8fafc',
    }}>
      {/* Floating Glass Navigation Header */}
      <nav style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(3, 7, 18, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem', filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }}>🏏</span>
          <span style={{ 
            fontWeight: 900, 
            fontSize: '1.25rem', 
            letterSpacing: '1.5px', 
            background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            SHADOWCOACH<span style={{ color: '#10b981', WebkitTextFillColor: 'initial', fontWeight: 900 }}>.AI</span>
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#eab308',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            background: 'rgba(234, 179, 8, 0.08)',
            padding: '4px 14px',
            borderRadius: '30px',
            letterSpacing: '1px',
            boxShadow: '0 0 15px rgba(234,179,8,0.1)'
          }}>
            PRO TELEMETRY CORE
          </div>
        </div>
      </nav>

      {/* Premium Athletic Hero Banner */}
      <header style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      }}>
        {/* Stadium light visual backdrop */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/stadium-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 42%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.16,
          filter: 'blue-shift contrast(1.15)',
        }} />
        
        {/* Sleek radial shading */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(3, 7, 18, 0.95) 80%, #030712 100%)',
        }} />
        
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '3.6rem',
          fontWeight: 900,
          color: '#ffffff',
          margin: 0,
          position: 'relative',
          zIndex: 2,
          letterSpacing: '-0.5px',
          textAlign: 'center',
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        }}>
          Cricket Shadow Coach
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '1.18rem',
          marginTop: '10px',
          fontWeight: 400,
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '650px',
          letterSpacing: '0.2px',
        }}>
          Professional Training Meets Artificial Intelligence — Perfect Your Biomechanical Technique
        </p>
        
        <div style={{
          width: '80px',
          height: '4px',
          background: 'linear-gradient(90deg, #f59e0b, #ca8a04)',
          marginTop: '20px',
          borderRadius: '10px',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.45)',
        }} />
      </header>

      {/* Symmetrical Grid Dashboard */}
      <main className="main-content" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <CameraFeed />
      </main>

      {/* Symmetrical Lab Branding Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '36px 20px',
        background: 'rgba(3, 7, 18, 0.85)',
        color: '#475569',
        fontSize: '0.8rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        letterSpacing: '0.5px'
      }}>
        <span>Engineered by </span>
        <span style={{
          color: '#cbd5e1',
          fontWeight: 800,
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.85rem',
          letterSpacing: '1px'
        }}>BILAL HASAN</span>
        <span style={{ margin: '0 14px', opacity: 0.15 }}>|</span>
        <span>© 2026 Sports Biomechanics Laboratory</span>
      </footer>
    </div>
  );
}

export default App;
