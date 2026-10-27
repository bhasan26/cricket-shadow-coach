import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from './components/Footer';
import './LandingPage.css';

// SVG Arrow for buttons — module scope so it isn't recreated on every render.
const ArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

function LandingPage({ onStartAnalysis, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedProgram, setExpandedProgram] = useState(0);

  const programsData = [
    {
      title: "FOR BEGINNERS",
      summary: "A simple place to start practicing stance and full batting movements.",
      detail: "Choose a stroke, keep your full body in view, and practice at your own pace. See a skeleton overlay and movement feedback after each attempt. Start with the defensive block and build from there.",
      tags: ["DEFENSIVE BLOCK", "BASIC STANCE", "CAMERA SETUP", "SHADOW PRACTICE"],
      image: "/rising_star_avatar.png"
    },
    {
      title: "FOR AMATEURS",
      summary: "Refine your technique and build consistency for weekend matches and club leagues.",
      detail: "Practice five batting strokes and compare repeat attempts. Your recent scores and consistency are saved in this browser, so you can follow your practice over time.",
      tags: ["CONSISTENCY", "FIVE BATTING DRILLS", "LOCAL HISTORY", "REPEAT PRACTICE"],
      image: "/rohit_sharma_pull_hero.png"
    },
    {
      title: "FOR PROFESSIONALS",
      summary: "An extra view of your practice to discuss with your coach.",
      detail: "Review estimated joint movement and compare videos side by side. Camera-based estimates depend on framing and tracking quality; use them alongside a coach's judgment.",
      tags: ["MOVEMENT REVIEW", "JOINT ESTIMATES", "VIDEO COMPARISON", "COACH DISCUSSION"],
      image: "/babar_azam_coverdrive_hero.png"
    },
    {
      title: "FOR COACHES",
      summary: "Use video comparison and movement estimates to support coaching conversations.",
      detail: "Load a player's video and a reference clip for side-by-side review, adjustable playback, and A/B looping. The beta focuses on individual practice; history stays in the current browser.",
      tags: ["VIDEO REVIEW", "SIDE-BY-SIDE", "SLOW PLAYBACK", "A/B LOOPING"],
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

  // Pointer-tracked 3D tilt on .tilt-3d cards. Inline transforms so the
  // scroll-reveal transition on the same elements is never overridden at rest.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = document.querySelectorAll('.tilt-3d');
    const listeners = [];
    cards.forEach((card) => {
      const move = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transition = 'transform 0.1s ease-out';
        card.style.transform =
          `perspective(1000px) rotateX(${((0.5 - py) * 8).toFixed(2)}deg) rotateY(${((px - 0.5) * 8).toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      };
      const leave = () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        card.style.transform = '';
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      listeners.push([card, move, leave]);
    });
    return () => listeners.forEach(([card, move, leave]) => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
    });
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <div className="courto-landing">
      <Helmet>
        <title>Cricket Shadow Coach — Free AI Batting & Bowling Analysis</title>
        <meta name="description" content="Practice cricket strokes with free camera-based movement feedback, five batting drills, and local video comparison. Video stays on your device; joint coordinates are sent for scoring." />
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
          <img fetchPriority="high" decoding="async" src="/hero_cricket_bat.jpg" alt="Cricket bat and ball, symbolizing AI-powered batting and bowling technique analysis" className="hero-img" />
          <div className="hero-overlay"></div>
          <div className="hero-orb orb-1"></div>
          <div className="hero-orb orb-2"></div>
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
            Practice cricket strokes with camera-based movement feedback. Choose a drill, play a full stroke, and compare your next attempt.
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
            <div className="stat-value">5</div>
            <div className="stat-label">BATTING DRILLS</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">33</div>
            <div className="stat-label">TRACKED LANDMARKS</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">FREE</div>
            <div className="stat-label">DURING BETA</div>
          </div>
        </div>
      </section>

      {/* ── How It Works / Feature Block ── */}
      <section id="how-it-works" className="feature-block-section">
        <div className="feature-block">
          <div className="feature-block-img reveal">
            <img loading="lazy" decoding="async" src="/cricket_batting_hero.png" alt="AI skeletal landmark tracking overlay on a cricket batter's stroke" />
            <div className="feature-glass-tag">
              <span className="dot"></span> REAL-TIME TRACKING
            </div>
          </div>
          <div className="feature-block-text reveal reveal-delay-2">
            <h4 className="section-subtitle">THE PROCESS</h4>
            <h2 className="section-title">STAND IN FRONT OF CAMERA & <span className="text-neon">PLAY</span></h2>
            <p className="section-desc">
              Stand back with your full body in view, choose a batting drill, and play one full stroke. The app estimates 33 body landmarks and compares your movement with reference strokes. Tracking quality varies with your device, lighting, and camera position.
            </p>
            <ul className="feature-list">
              <li><ArrowRight /> Guided cover-drive practice: five strokes, one focus, five more</li>
              <li><ArrowRight /> Indicative bowling arm-extension estimates</li>
              <li><ArrowRight /> Tracking-quality guidance and joint movement feedback</li>
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
          <div className="style-card tilt-3d reveal">
            <img loading="lazy" decoding="async" src="/kagiso_rabada_fastballer.png" alt="Fast bowler mid-delivery, analyzed for ICC-legal arm extension" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BOWLING</div>
              <h3 className="style-card-title">FAST BOWLING</h3>
              <p className="style-card-desc">Review an estimated elbow-extension range. An indicative practice screen, not an official legality assessment.</p>
            </div>
            <div className="tilt-glare"></div>
          </div>
          {/* Card 2 */}
          <div className="style-card tilt-3d reveal reveal-delay-1">
            <img loading="lazy" decoding="async" src="/shane_warne_hero.png" alt="Spin bowling practice illustration" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BOWLING</div>
              <h3 className="style-card-title">SPIN BOWLING</h3>
              <p className="style-card-desc">Use the bowling movement screen or compare your delivery with a reference video.</p>
            </div>
            <div className="tilt-glare"></div>
          </div>
          {/* Card 3 */}
          <div className="style-card tilt-3d reveal reveal-delay-2">
            <img loading="lazy" decoding="async" src="/babar_azam_coverdrive_hero.png" alt="Batter practicing a cover drive" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BATTING</div>
              <h3 className="style-card-title">COVER DRIVE</h3>
              <p className="style-card-desc">Practice the classic off-side drive and compare your joint movement through the stroke.</p>
            </div>
            <div className="tilt-glare"></div>
          </div>
          {/* Card 4 */}
          <div className="style-card tilt-3d reveal reveal-delay-3">
            <img loading="lazy" decoding="async" src="/rohit_sharma_pull_hero.png" alt="Batter practicing a pull shot" className="style-card-bg" />
            <div className="style-card-overlay">
              <div className="style-card-tag">BATTING</div>
              <h3 className="style-card-title">PULL SHOT</h3>
              <p className="style-card-desc">Review the movement of your arms and knees through a full pull-shot practice swing.</p>
            </div>
            <div className="tilt-glare"></div>
          </div>
        </div>
      </section>

      {/* ── Solid Neon Info Block ── */}
      <section className="solid-info-section reveal">
        <div className="solid-info-content">
          <h2 className="solid-info-title">DEMOCRATIZING<br />SPORTS SCIENCE</h2>
          <p className="solid-info-desc">
            Build a regular practice habit with the camera you already have. Get movement estimates and reference comparisons at home, then take your questions to a coach.
          </p>
          <button className="courto-btn courto-btn-outline dark-outline" onClick={onStartAnalysis}>
            START ANALYSIS <ArrowRight />
          </button>
        </div>
        <div className="solid-info-visual">
          <img loading="lazy" decoding="async" src="/cricket_bowler_hero.png" alt="Illustration of a cricket bowling movement overlay" />
          <div className="bio-glass-card top-right">
            <span className="bio-label">MOVEMENT REVIEW</span>
            <span className="bio-val">PRACTICE</span>
          </div>
          <div className="bio-glass-card bottom-left">
            <span className="bio-label">CAMERA ESTIMATES</span>
            <span className="bio-val">INDICATIVE</span>
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
          <div className="spill s-neon spill-3">VIDEO STAYS LOCAL</div>
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
            <h3 className="scatter-card-title">YOUR VIDEO STAYS LOCAL</h3>
            <p className="scatter-card-text">"Pose detection runs in your browser. Your camera video stays on your device; joint coordinates are sent to our API to compare your movement with reference strokes. Practice history stays in this browser."</p>
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
            <p className="scatter-card-text">"Cricket Coach is an independent project making guided shadow practice more accessible. Our aim is useful practice feedback with clear limits on what a camera can measure."</p>
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
                      <img loading="lazy" decoding="async" src={prog.image} alt={`Cricket player representing the ${prog.title.toLowerCase()} coaching program`} className="accordion-image" />
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

          <div className="pricing-card tilt-3d reveal reveal-delay-2">
            <div className="pricing-card-badge">BETA ACCESS</div>
            <div className="pricing-price">$0<span className="pricing-period">/ MONTH</span></div>
            <ul className="pricing-features-list">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                Real-time pose estimation & tracking
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                Indicative bowling movement screen
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
            <div className="tilt-glare"></div>
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
