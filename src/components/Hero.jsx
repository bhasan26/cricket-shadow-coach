// Cyberpunk sports-telemetry hero banner shown above the live/dashboard views.
export default function Hero() {
  return (
    <header className="hero-banner" style={{
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      padding: '24px 0 16px', borderBottom: '1px solid rgba(0, 245, 160, 0.06)',
    }}>
      {/* Stadium backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/stadium-bg.png)', backgroundSize: 'cover',
        backgroundPosition: 'center 43%', backgroundRepeat: 'no-repeat',
        opacity: 0.18, filter: 'hue-rotate(180deg) contrast(1.25) brightness(0.75)',
      }} />
      {/* Shading gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 15, 25, 0.92) 80%, #0b0f19 100%)',
      }} />

      <h1 style={{
        fontFamily: "'Chakra Petch', 'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 'clamp(1.5rem, 5vw, 2.4rem)', fontWeight: 900, textTransform: 'uppercase',
        margin: 0, position: 'relative', zIndex: 2, letterSpacing: '2px', textAlign: 'center',
        background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        textShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}>
        Cricket Shadow Coach
      </h1>
      <p className="hero-subtitle" style={{
        color: '#cbd5e1', fontSize: 'clamp(0.78rem, 3vw, 0.9rem)', marginTop: '6px',
        fontWeight: 600, position: 'relative', zIndex: 2, textAlign: 'center',
        maxWidth: '680px', letterSpacing: '0.5px', textTransform: 'uppercase',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        Stand in front of your camera and play a shot. The AI will analyse your technique in real time.
      </p>

      <div style={{
        width: '60px', height: '2px',
        background: 'linear-gradient(90deg, #00f5a0, #00e5ff)',
        marginTop: '10px', borderRadius: '10px', position: 'relative', zIndex: 2,
        boxShadow: '0 0 10px rgba(0, 245, 160, 0.4)',
      }} />
    </header>
  );
}
