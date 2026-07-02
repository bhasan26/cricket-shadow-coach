import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from './components/Footer';
import './LandingPage.css';

function LandingPage({ onStartAnalysis, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedProgram, setExpandedProgram] = useState(0);

  const programsData = [
    {
      title: "FOR BEGINNERS",
      summary: "A welcoming introduction to cricket mechanics focused on basic stance, grip, and confidence-building.",
      detail: "Progressive programs crafted to nurture young or new talent from foundational skills. Players train in dynamic shadows that focus on balance, grip fundamentals, and early swing mechanics—all supported by our AI engine.",
      tags: ["CONFIDENCE BUILDING", "BASIC STANCE", "GRIP FUNDAMENTALS", "EARLY SWING"],
      image: "/rising_star_avatar.png"
    },
    {
      title: "FOR AMATEURS",
      summary: "Refine your technique and build consistency for weekend matches and club leagues.",
      detail: "Elevate your game with advanced shadow coaching designed for club players. Focus on specific shot selections, bowling run-ups, and fielding reflexes to gain a competitive edge in your local league.",
      tags: ["CONSISTENCY", "SHOT SELECTION", "BOWLING RUN-UP", "MATCH AWARENESS"],
      image: "/rohit_sharma_pull_hero.png"
    },
    {
      title: "FOR PROFESSIONALS",
      summary: "Elite biomechanical analysis for high-performance athletes demanding millimeter perfection.",
      detail: "Laboratory-grade kinematic data at your fingertips. Our AI tracks joint angles, bat speed, and release points with unprecedented accuracy to fine-tune mechanics for the professional arena.",
      tags: ["KINEMATICS", "JOINT ANGLES", "BAT SPEED", "RELEASE POINT"],
      image: "/babar_azam_coverdrive_hero.png"
    },
    {
      title: "FOR COACHES",
      summary: "Powerful team management and bulk analysis tools to elevate your entire squad.",
      detail: "Manage your academy with ease. Track the progress of multiple players, compare side-by-side techniques, and provide data-backed feedback that accelerates your team's development.",
      tags: ["SQUAD MANAGEMENT", "SIDE-BY-SIDE", "PROGRESS TRACKING", "DATA FEEDBACK"],
      image: "/cricket_coach_avatar.png"
    }
  ];

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
      <Helmet>
        <title>Cricket Shadow Coach — Free AI Batting & Bowling Analysis</title>
        <meta name="description" content="Free, real-time AI biomechanical analysis for cricket. Track 33+ skeletal landmarks for batting strokes and check ICC bowling legality in your browser." />
        <link rel="canonical" href="https://www.cricketcoach.online/" />
      </Helmet>
      {/* ── Navigation ── */}
      <header>
      <nav className={`courto-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => { window.scrollTo(0, 0); if (onNavigate) onNavigate('home'); }}>
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
      </header>

      <main>
      {/* ── Hero Section ── */}
      <section className="courto-hero">
        <div className="hero-bg">
          <img src="/hero_cricket_bat.jpg" alt="Cricket bat and ball, symbolizing AI-powered batting and bowling technique analysis" className="hero-img" />
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
            <img src="/cricket_batting_hero.png" alt="AI skeletal landmark tracking overlay on a cricket batter's stroke" />
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
            <img src="/kagiso_rabada_fastballer.png" alt="Fast bowler mid-delivery, analyzed for ICC-legal arm extension" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BOWLING</div>
              <h3 className="style-card-title">FAST BOWLING</h3>
              <p className="style-card-desc">140+ km/h • High impact. Check your arm extension for ICC legality instantly.</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="style-card reveal reveal-delay-1">
            <img src="/shane_warne_hero.png" alt="Spin bowler releasing the ball, tracked for drift, turn, and release point" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BOWLING</div>
              <h3 className="style-card-title">SPIN BOWLING</h3>
              <p className="style-card-desc">Finger & wrist spin. Analyze drift, turn, and release points.</p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="style-card reveal reveal-delay-2">
            <img src="/babar_azam_coverdrive_hero.png" alt="Batter executing a cover drive, checked for head alignment and full bat face" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BATTING</div>
              <h3 className="style-card-title">COVER DRIVE</h3>
              <p className="style-card-desc">Classic off-side. Ensure perfect head alignment and full face execution.</p>
            </div>
          </div>
          {/* Card 4 */}
          <div className="style-card reveal reveal-delay-3">
            <img src="/rohit_sharma_pull_hero.png" alt="Batter playing a pull shot, analyzed for weight transfer and bat swing path" className="style-card-bg" />
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
          <h2 className="solid-info-title">DEMOCRATIZING<br />SPORTS SCIENCE</h2>
          <p className="solid-info-desc">
            Previously requiring multi-million dollar motion capture studios, our web-based neural network pipeline delivers precise analytics from any standard camera or mobile device.
          </p>
          <button className="courto-btn courto-btn-outline dark-outline" onClick={onStartAnalysis}>
            START ANALYSIS <ArrowRight />
          </button>
        </div>
        <div className="solid-info-visual">
          <img src="/cricket_bowler_hero.png" alt="AI cricket analysis overlay showing a legal 14 degree bowling elbow angle" />
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

      {/* ── About Us Scattered Layout ── */}
      <section id="about" className="about-scatter-section">
        <div className="scatter-header-wrapper reveal">
          <div className="section-pill">ABOUT US</div>
          <h2 className="scatter-title">AN INDEPENDENT PROJECT FOR<br />THE LOVERS OF CRICKET</h2>
        </div>

        <div className="scatter-pills-container reveal">
          <div className="spill s-black spill-1">PASSION PROJECT</div>
          <div className="spill s-outline spill-2">FOR ALL LEVELS</div>
          <div className="spill s-neon spill-3">100% LOCAL</div>
          <div className="spill s-outline spill-4">NO CLOUD</div>
          <div className="spill s-black spill-5">BIOMECHANICS</div>
          <div className="spill s-neon spill-6">FREE BETA</div>
          <div className="spill s-black spill-7">AI POWERED</div>
          <div className="spill s-outline spill-8">PRIVATE</div>
          <div className="spill s-outline spill-9">FOR CRICKET</div>
        </div>

        <div className="scatter-cards-container reveal reveal-delay-2">
          {/* Card 1 */}
          <div className="scatter-card">
            <div className="scatter-quote-icon">"</div>
            <h3 className="scatter-card-title">100% LOCAL PROCESSING</h3>
            <p className="scatter-card-text">"Unlike other platforms, we don't upload your videos to the cloud. Our computer vision models run entirely on your device inside your browser. Your technique data never leaves your computer."</p>
            <div className="scatter-card-author">
              <div className="scatter-author-img"></div>
              <div className="scatter-author-info">
                <h4>DATA PRIVACY</h4>
                <p>CORE PRINCIPLE</p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="scatter-card">
            <div className="scatter-quote-icon">"</div>
            <h3 className="scatter-card-title">OUR MISSION</h3>
            <p className="scatter-card-text">"Cricket Coach is built to democratize access to elite biomechanical analysis. We believe every player deserves laboratory-grade technique feedback without privacy compromises."</p>
            <div className="scatter-card-author">
              <div className="scatter-author-img"></div>
              <div className="scatter-author-info">
                <h4>GLOBAL ACCESS</h4>
                <p>DEMOCRATIZED AI</p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="scatter-card">
            <div className="scatter-quote-icon">"</div>
            <h3 className="scatter-card-title">BUILT BY FANS, FOR FANS</h3>
            <p className="scatter-card-text">"This is a totally independent passion project. Built by a true lover of the game, dedicated entirely to the millions of cricket lovers around the world who want to perfect their technique."</p>
            <div className="scatter-card-author">
              <div className="scatter-author-img" style={{ background: 'var(--accent-mint)' }}></div>
              <div className="scatter-author-info">
                <h4>BILAL HASAN</h4>
                <p>CREATOR & ENGINEER</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Programs Accordion ── */}
      <section id="programs" className="programs-accordion-section">
        <div className="accordion-container reveal">
          {programsData.map((prog, idx) => {
            const isActive = expandedProgram === idx;
            return (
              <div
                key={idx}
                className={`accordion-item ${isActive ? 'active' : ''}`}
                onClick={() => setExpandedProgram(isActive ? null : idx)}
              >
                <div className="accordion-header">
                  <h2 className="accordion-title">{prog.title}</h2>
                  <div className={`accordion-icon ${isActive ? 'active' : ''}`}>
                    {isActive ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" /></svg>
                    )}
                  </div>
                </div>
                {isActive && (
                  <div className="accordion-content">
                    <div className="accordion-summary-col">
                      <p className="accordion-summary">{prog.summary}</p>
                    </div>
                    <div className="accordion-detail-col">
                      <p className="accordion-detail">{prog.detail}</p>
                      <div className="accordion-tags">
                        {prog.tags.map(tag => (
                          <span key={tag} className="accordion-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="accordion-image-col">
                      <img src={prog.image} alt={`Cricket player representing the ${prog.title.toLowerCase()} coaching program`} className="accordion-image" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                Real-time pose estimation & tracking
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                ICC bowling compliance audit
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                Batting stroke analysis & scoring
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                Video upload & frame-by-frame review
              </li>
            </ul>
            <button className="courto-btn courto-btn-primary w-full" onClick={onStartAnalysis}>
              GET STARTED NOW
            </button>
          </div>
        </div>
      </section>

      </main>

      {/* ── Footer ── */}
      <Footer onNavigate={onNavigate} />

    </div>
  );
}

export default LandingPage;
