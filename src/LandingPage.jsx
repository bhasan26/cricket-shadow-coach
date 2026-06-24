import React, { useState, useEffect } from 'react';
import Footer from './components/Footer';
import './LandingPage.css';

function LandingPage({ onStartAnalysis, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setMenuOpen(false);

  // SVG Arrow for buttons
  const ArrowRight = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );

  return (
    <div className="courto-landing">
      {/* ── Navigation ── */}
      <nav className={`courto-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            CRICKET<span>COACH</span>
          </div>

          <div className="nav-links desktop-only">
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
          </div>

          <div className="nav-actions desktop-only">
            <button className="courto-btn courto-btn-primary" onClick={onStartAnalysis}>
              Analyze Now
            </button>
          </div>

          <button
            className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-links">
            <a href="#how-it-works" onClick={close}>How It Works</a>
            <a href="#features" onClick={close}>Features</a>
            <a href="#pricing" onClick={close}>Pricing</a>
            <a href="#about" onClick={close}>About</a>
            <button className="courto-btn courto-btn-primary mobile-cta" onClick={() => { close(); onStartAnalysis(); }}>
              Analyze Now
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="courto-hero">
        <div className="hero-bg">
          <img src="/hero_cricket_bat.jpg" alt="Cricket Bat and Ball" className="hero-img" />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge reveal">
            <span className="badge-dot"></span> NEXT-GEN CRICKET ANALYSIS
          </div>
          <h1 className="hero-title reveal reveal-delay-1">
            MASTER YOUR<br />
            <span className="text-neon">TECHNIQUE</span>
          </h1>
          <p className="hero-desc reveal reveal-delay-2">
            Professional biomechanical analysis powered by computer vision. Perfect your bowling action and batting strokes with real-time feedback.
          </p>
          <div className="hero-buttons reveal reveal-delay-3">
            <button className="courto-btn courto-btn-primary" onClick={onStartAnalysis}>
              START TRAINING <ArrowRight />
            </button>
            <a href="#how-it-works" className="courto-btn courto-btn-outline">
              DISCOVER MORE
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="stats-strip">
        <div className="stats-container reveal">
          <div className="stat-item">
            <div className="stat-value">15<span className="text-neon">ms</span></div>
            <div className="stat-label">INFERENCE LATENCY</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">33<span className="text-neon">+</span></div>
            <div className="stat-label">TRACKED LANDMARKS</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">11.1</div>
            <div className="stat-label">ICC RULE COMPLIANCE</div>
          </div>
        </div>
      </section>

      {/* ── How It Works / Feature Block ── */}
      <section id="how-it-works" className="feature-block-section">
        <div className="feature-block">
          <div className="feature-block-img reveal">
            <img src="/cricket_batting_hero.png" alt="Batting Analysis" />
            <div className="feature-glass-tag">
              <span className="dot"></span> REAL-TIME TRACKING
            </div>
          </div>
          <div className="feature-block-text reveal reveal-delay-2">
            <h4 className="section-subtitle">THE PROCESS</h4>
            <h2 className="section-title">STAND IN FRONT OF CAMERA & <span className="text-neon">PLAY</span></h2>
            <p className="section-desc">
              Our AI tracks 33 skeletal landmarks at 30+ FPS, classifies your action in real-time, and delivers precise biomechanical feedback. No special equipment needed. Just your device's camera.
            </p>
            <ul className="feature-list">
              <li><ArrowRight /> Instant stroke-by-stroke scoring</li>
              <li><ArrowRight /> ICC bowling compliance verification</li>
              <li><ArrowRight /> Sub-degree joint accuracy diagnostics</li>
            </ul>
            <button className="courto-btn courto-btn-outline mt-4" onClick={onStartAnalysis}>
              TRY IT NOW
            </button>
          </div>
        </div>
      </section>

      {/* ── Action Styles (Grid) ── */}
      <section id="features" className="action-styles-section">
        <div className="section-header center reveal">
          <h4 className="section-subtitle">SIMULATIONS & STYLES</h4>
          <h2 className="section-title">BOWLING & BATTING <span className="text-neon">ANALYSIS</span></h2>
        </div>

        <div className="styles-grid">
          {/* Card 1 */}
          <div className="style-card reveal">
            <img src="/kagiso_rabada_fastballer.png" alt="Fast Bowling" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BOWLING</div>
              <h3 className="style-card-title">FAST BOWLING</h3>
              <p className="style-card-desc">140+ km/h • High impact. Check your arm extension for ICC legality instantly.</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="style-card reveal reveal-delay-1">
            <img src="/shane_warne_hero.png" alt="Leg Spin" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BOWLING</div>
              <h3 className="style-card-title">SPIN BOWLING</h3>
              <p className="style-card-desc">Finger & wrist spin. Analyze drift, turn, and release points.</p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="style-card reveal reveal-delay-2">
            <img src="/babar_azam_coverdrive_hero.png" alt="Cover Drive" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BATTING</div>
              <h3 className="style-card-title">COVER DRIVE</h3>
              <p className="style-card-desc">Classic off-side. Ensure perfect head alignment and full face execution.</p>
            </div>
          </div>
          {/* Card 4 */}
          <div className="style-card reveal reveal-delay-3">
            <img src="/rohit_sharma_pull_hero.png" alt="Pull Shot" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BATTING</div>
              <h3 className="style-card-title">PULL SHOT</h3>
              <p className="style-card-desc">Cross-bat power. Diagnose weight transfer and bat swing path.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solid Neon Info Block ── */}
      <section className="solid-info-section reveal">
        <div className="solid-info-content">
          <h2 className="solid-info-title">DEMOCRATIZING<br/>SPORTS SCIENCE</h2>
          <p className="solid-info-desc">
            Previously requiring multi-million dollar motion capture studios, our web-based neural network pipeline delivers precise analytics from any standard camera or mobile device.
          </p>
          <button className="courto-btn courto-btn-outline dark-outline" onClick={onStartAnalysis}>
            START ANALYSIS <ArrowRight />
          </button>
        </div>
        <div className="solid-info-visual">
           <img src="/cricket_bowler_hero.png" alt="Biomechanical Overlay" />
           <div className="bio-glass-card top-right">
             <span className="bio-label">ELBOW ANGLE</span>
             <span className="bio-val">14° LEGAL</span>
           </div>
           <div className="bio-glass-card bottom-left">
             <span className="bio-label">KNEE FLEXION</span>
             <span className="bio-val">65°</span>
           </div>
        </div>
      </section>

      {/* ── About Us & Privacy Section ── */}
      <section id="about" className="about-privacy-section">
        <div className="about-container reveal">
          <div className="about-header">
            <h4 className="section-subtitle">ABOUT US</h4>
            <h2 className="section-title">YOUR PRIVACY IS <span className="text-neon">ABSOLUTE</span></h2>
          </div>
          <div className="about-content">
            <div className="about-card">
              <div className="about-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h3>100% LOCAL PROCESSING</h3>
              <p>Unlike other platforms, we don't upload your videos to the cloud. Our computer vision models run entirely on your device inside your browser. Your technique data never leaves your computer.</p>
            </div>
            <div className="about-card">
              <div className="about-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3>OUR MISSION</h3>
              <p>Cricket Coach is built to democratize access to elite biomechanical analysis. We believe every player deserves laboratory-grade technique feedback without privacy compromises.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-header reveal">
             <h4 className="section-subtitle">ACCESS</h4>
             <h2 className="section-title">FREE DURING <span className="text-neon">BETA</span></h2>
             <p className="section-desc">Every feature, every analysis tool, completely free while we refine the platform. No credit card. No commitment.</p>
          </div>
          
          <div className="pricing-card reveal reveal-delay-2">
            <div className="pricing-card-badge">BETA ACCESS</div>
            <div className="pricing-price">$0<span className="pricing-period">/ MONTH</span></div>
            <ul className="pricing-features-list">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
                Real-time pose estimation & tracking
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
                ICC bowling compliance audit
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
                Batting stroke analysis & scoring
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
                Video upload & frame-by-frame review
              </li>
            </ul>
            <button className="courto-btn courto-btn-primary w-full" onClick={onStartAnalysis}>
              GET STARTED NOW
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer onNavigate={onNavigate} />

    </div>
  );
}

export default LandingPage;
