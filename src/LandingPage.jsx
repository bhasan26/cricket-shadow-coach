import React from 'react';
import './LandingPage.css';

function LandingPage({ onStartAnalysis }) {
  return (
    <div className="landing-container">
      {/* Top Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          CRICKETCOACH<span>.ONLINE</span>
        </div>
        
        <div className="nav-links">
          <a href="#how-it-works" className="nav-link">HOW IT WORKS</a>
          <a href="#features" className="nav-link">FEATURES</a>
          <a href="#training" className="nav-link">TRAINING</a>
          <a href="#pricing" className="nav-link">PRICING</a>
          <a href="#about-us" className="nav-link">ABOUT US</a>
          <button className="btn-get-started" onClick={onStartAnalysis}>GET STARTED</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Unlock Your<br />
            Batting & Bowling<br />
            Potential
          </h1>
          <p className="hero-subtitle">
            From ICC Compliance to Elite Performance. Train to detect, 
            refine, and perfect every batting stroke and delivery action.
          </p>
          <button className="btn-begin-analysis" onClick={onStartAnalysis}>
            BEGIN YOUR ANALYSIS
          </button>
        </div>

        <div className="hero-visual">
          <div className="bowler-img-wrapper">
            <img 
              src="/cricket_bowler_hero.png" 
              alt="Professional Cricket Bowler Biomechanical Telemetry" 
              className="bowler-img"
            />
            
            {/* Skeletal Tracking Overlay Layer */}
            <svg className="skeleton-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Back Leg (Trailing) */}
              <line x1="330" y1="800" x2="420" y2="440" className="skeleton-bone" />
              <line x1="330" y1="800" x2="300" y2="820" className="skeleton-bone" />

              {/* Front Leg (Leading) */}
              <line x1="420" y1="440" x2="480" y2="580" className="skeleton-bone" />
              <line x1="480" y1="580" x2="430" y2="780" className="skeleton-bone" />
              <line x1="430" y1="780" x2="390" y2="810" className="skeleton-bone" />

              {/* Spine */}
              <line x1="420" y1="440" x2="520" y2="290" className="skeleton-bone" />

              {/* Non-Bowling Arm (Extended Forward) */}
              <line x1="520" y1="290" x2="400" y2="450" className="skeleton-bone" />
              <line x1="400" y1="450" x2="350" y2="430" className="skeleton-bone" />

              {/* Bowling Arm (High up, releasing) */}
              <line x1="520" y1="290" x2="620" y2="180" className="skeleton-bone" />
              <line x1="620" y1="180" x2="710" y2="110" className="skeleton-bone" />

              {/* Joints */}
              {/* Back ankle */}
              <circle cx="330" cy="800" r="8" className="joint-point" />
              {/* Back knee */}
              <circle cx="420" cy="440" r="9" className="joint-point" />
              {/* Front hip */}
              <circle cx="420" cy="440" r="10" className="joint-point" />
              {/* Front knee */}
              <circle cx="480" cy="580" r="9" className="joint-point joint-point-pulse" />
              {/* Front ankle */}
              <circle cx="430" cy="780" r="8" className="joint-point" />
              {/* Chest / Shoulder */}
              <circle cx="520" cy="290" r="10" className="joint-point" />
              {/* Non-bowling elbow */}
              <circle cx="400" cy="450" r="8" className="joint-point" />
              {/* Non-bowling wrist */}
              <circle cx="350" cy="430" r="7" className="joint-point" />
              {/* Bowling elbow */}
              <circle cx="620" cy="180" r="9" className="joint-point joint-point-pulse" />
              {/* Bowling wrist / ball release */}
              <circle cx="710" cy="110" r="8" className="joint-point" />
            </svg>

            {/* Glowing Biomechanical Floating Badges */}
            <div className="bio-label" style={{ top: '15%', right: '35%' }}>
              ELBOW ANGLE:<span>14° (LEGAL)</span>
            </div>
            
            <div className="bio-label" style={{ top: '8%', right: '10%' }}>
              RELEASE POINT
            </div>
            
            <div className="bio-label" style={{ top: '48%', left: '42%' }}>
              KNEE FLEXION:<span>65°</span>
            </div>

            <div className="bio-label" style={{ top: '78%', left: '45%' }}>
              BRACED ANGLE:<span>25°</span>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Analysis Pipeline Section */}
      <section className="pipeline-section" id="how-it-works">
        <span className="section-tag">Methodology</span>
        <h2 className="section-title">How It Works: Our Analysis Pipeline</h2>
        <p className="section-subtitle" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px', color: '#1e654c', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Our AI models are trained on extensive datasets, including thousands of professional cricket videos and biomechanical data points from Kaggle. We use advanced computer vision and deep learning to break down every frame of your action, providing laboratory-grade feedback directly from your device.
        </p>
        
        <div className="pipeline-grid">
          {/* Card 1 */}
          <div className="pipeline-card">
            <div className="card-icon-wrapper">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h3 className="card-title">Action Classification</h3>
            <p className="card-desc">
              Detect spin, pace, and unique styles instantly using convolutional feature extraction sequences.
            </p>
          </div>

          {/* Card 2 */}
          <div className="pipeline-card">
            <div className="card-icon-wrapper">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.16 22a4 4 0 0 1-1-6.28l1.41-1.41a6 6 0 0 1 8.49 0l1.41 1.41A4 4 0 0 1 15.34 22z" />
                <circle cx="12" cy="5" r="3" />
                <path d="m8 10 3 3 1-1-3-3" />
                <path d="m16 10-3 3-1-1 3-3" />
              </svg>
            </div>
            <h3 className="card-title">Biomechanical Tracking</h3>
            <p className="card-desc">
              Precision joint angles, body tilt alignments, and physical movement sequences mapped dynamically frame-by-frame.
            </p>
          </div>

          {/* Card 3 */}
          <div className="pipeline-card">
            <div className="card-icon-wrapper">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M21 12H3" />
                <path d="M12 3v18" />
                <circle cx="7.5" cy="7.5" r="1.5" />
                <path d="m14 16 2-2 3 3" />
              </svg>
            </div>
            <h3 className="card-title">Performance Insights</h3>
            <p className="card-desc">
              Receive clear, actionable feedback reports to fine-tune your release technique and avoid stress injuries.
            </p>
          </div>
        </div>
      </section>

      {/* Explore Bowling Styles Section */}
      <section className="styles-section" id="features">
        <span className="section-tag" style={{ color: '#1e654c' }}>Simulations</span>
        <h2 className="section-title" style={{ color: '#122a20' }}>Explore Bowling Styles</h2>
        
        <div className="styles-grid">
          {/* Card 1: Fast Bowling */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/kagiso_rabada_fastballer.png)',
                transform: 'scale(1.15) rotate(5deg)'
              }} 
            />
            <div className="style-card-overlay" />
            
            {/* Neon trajectory path drawing on hover */}
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-fast" 
                d="M 50 350 Q 150 180 250 320" 
              />
            </svg>
 
            <div className="style-card-content">
              <h3 className="style-card-title">Fast Bowling</h3>
            </div>
          </div>
 
          {/* Card 2: Off-Spin */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/nathan_lyon_offspin.png)',
                transform: 'scale(1.15) translate(0, -10px)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-offspin" 
                d="M 50 350 C 100 80, 180 120, 220 300" 
              />
            </svg>
 
            <div className="style-card-content">
              <h3 className="style-card-title">Off-Spin</h3>
            </div>
          </div>
 
          {/* Card 3: Leg-Spin */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/shane_warne_hero.png)',
                transform: 'scale(1.15) translate(0, -10px)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-legspin" 
                d="M 50 350 C 110 50, 160 140, 260 280" 
              />
            </svg>
 
            <div className="style-card-content">
              <h3 className="style-card-title">Leg-Spin</h3>
            </div>
          </div>
 
          {/* Card 4: Slower Balls */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/lasith_malinga_slower_hero.png)',
                transform: 'scale(1.15) translate(0, -10px)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-slower" 
                d="M 50 350 Q 150 100 240 350" 
              />
            </svg>
 
            <div className="style-card-content">
              <h3 className="style-card-title">Slower Balls</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Batting Styles Section */}
      <section className="styles-section" style={{ background: 'linear-gradient(180deg, var(--card-cream) 0%, var(--card-blue) 100%)', paddingTop: '40px' }} id="training">
        <span className="section-tag" style={{ color: '#1e654c' }}>Skeletal Alignment</span>
        <h2 className="section-title" style={{ color: '#122a20' }}>Explore Batting Styles</h2>
        
        <div className="styles-grid">
          {/* Card 1: Cover Drive */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/babar_azam_coverdrive_hero.png)',
                transform: 'scale(1.15) translate(-10px, 0)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-cover" 
                d="M 50 320 Q 150 360 250 350" 
              />
            </svg>

            <div className="style-card-content">
              <h3 className="style-card-title">Cover Drive</h3>
            </div>
          </div>

          {/* Card 2: Pull Shot */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/rohit_sharma_pull_hero.png)',
                transform: 'scale(1.15) translate(-10px, 0)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-pull" 
                d="M 50 250 Q 150 100 250 80" 
              />
            </svg>

            <div className="style-card-content">
              <h3 className="style-card-title">Pull Shot</h3>
            </div>
          </div>

          {/* Card 3: Forward Defensive */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/rahul_dravid_defensive_hero.png)',
                transform: 'scale(1.15) translate(0, -10px)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-defensive" 
                d="M 100 220 Q 120 280 130 350" 
              />
            </svg>

            <div className="style-card-content">
              <h3 className="style-card-title">Forward Defensive</h3>
            </div>
          </div>

          {/* Card 4: Flick Shot */}
          <div className="style-card">
            <div 
              className="style-card-bg" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(18, 42, 32, 0.4), rgba(18, 42, 32, 0.95)), url(/virat_kohli_flick_hero.png)',
                transform: 'scale(1.15) translate(-5px, 0)'
              }} 
            />
            <div className="style-card-overlay" />
            
            <svg className="style-card-svg" viewBox="0 0 300 400">
              <path 
                className="trajectory-path path-flick" 
                d="M 50 310 Q 150 220 250 260" 
              />
            </svg>

            <div className="style-card-content">
              <h3 className="style-card-title">Flick Shot</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Closed Beta) */}
      <section className="pricing-section" id="pricing">
        <span className="section-tag">Access Plans</span>
        <h2 className="section-title">Pricing & Subscriptions</h2>
        
        <div className="pricing-container">
          <div className="pricing-beta-badge">BETA MODE</div>
          
          <h3 className="pricing-title">System Status: In Testing</h3>
          <p className="card-desc" style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', marginBottom: '30px' }}>
            We are currently in the testing phase. All advanced AI diagnostics, biomechanical analysis, and coaching features are 100% free for our beta users.
          </p>
          
          <div className="pricing-price">
            $0<span>/ month</span>
          </div>
          
          <div className="pricing-notice-box" style={{ marginTop: '30px' }}>
            <h4 className="pricing-notice-title">Early Access Granted</h4>
            <p className="pricing-notice-desc">
              Join now to access our full suite of professional cricket analysis tools at no cost.
            </p>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="about-section" id="about-us">
        <div className="about-grid">
          <div className="about-content">
            <span className="section-tag" style={{ color: '#1e654c' }}>Our Mission</span>
            <h2 className="about-title">Sports Science Democratized</h2>
            <p className="about-para">
              Founded at the intersection of professional athletics and computer vision, <strong>cricketcoach.online</strong> was engineered to bring elite, laboratory-grade biomechanical feedback to every grassroots cricketer, academy trainer, and professional club in the world.
            </p>
            <p className="about-para">
              Previously, tracking elbow extension compliance under ICC Rule 11.1 or evaluating complex body tilts required multi-million dollar motion capture studios with retro-reflective markers. Our proprietary web-based neural network pipeline delivers these precise analytics using any standard web camera or mobile device.
            </p>
            
            <div className="about-pillars">
              <div className="about-pillar-card">
                <h4 className="pillar-title">Biometric Integrity</h4>
                <p className="pillar-desc">
                  Strictly aligned with established sports science methodologies and clinical orthopaedic principles.
                </p>
              </div>
              <div className="about-pillar-card">
                <h4 className="pillar-title">Neural Diagnostics</h4>
                <p className="pillar-desc">
                  Leveraging high-frequency feature extraction sequences and sequential LSTMs for action recognition.
                </p>
              </div>
            </div>
          </div>

          <div className="about-visual">
            <div className="about-visual-card">
              <h4 className="testimonial-header" style={{ marginBottom: '24px' }}>System Scale</h4>
              
              <div className="about-stat-row">
                <div>
                  <div className="about-stat-val">&lt; 15ms</div>
                  <div className="about-stat-lbl">Inference Latency</div>
                </div>
              </div>
              
              <div className="about-stat-row">
                <div>
                  <div className="about-stat-val">100k+</div>
                  <div className="about-stat-lbl">Sequences Logged</div>
                </div>
              </div>
              
              <div className="about-stat-row">
                <div>
                  <div className="about-stat-val">U10 - Pro</div>
                  <div className="about-stat-lbl">Adaptive Scaling</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="testimonials-grid">
          {/* Senior Coaches Column */}
          <div className="testimonial-block">
            <h3 className="testimonial-header">Senior Coaches</h3>
            <div className="testimonial-body">
              <img 
                src="/cricket_coach_avatar.png" 
                alt="Senior Cricket Coach headshot" 
                className="testimonial-avatar"
              />
              <div className="testimonial-text-wrapper">
                <p className="testimonial-quote">
                  "Cricketcoach.online's detailed biomechanical analysis makes it easy to spot and fix chucking and bowling inconsistencies. A must-have for modern clubs."
                </p>
                <p className="testimonial-author">Coach Davis, Senior Club Coach</p>
              </div>
            </div>
          </div>

          {/* Rising Stars Column */}
          <div className="testimonial-block">
            <h3 className="testimonial-header">Rising Stars</h3>
            <div className="testimonial-body">
              <img 
                src="/rising_star_avatar.png" 
                alt="Young Cricket Bowler Rising Star headshot" 
                className="testimonial-avatar"
              />
              <div className="testimonial-text-wrapper">
                <p className="testimonial-quote">
                  "Spotting elbow extension anomalies in real-time has redesigned the way we train our pace bowlers, keeping them healthy and peak performing."
                </p>
                <p className="testimonial-author">Ritesh, First-Class Bowler</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Symmetrical Footer */}
      <footer className="landing-footer">
        <div>
          © 2026 <span className="footer-brand">cricketcoach.online</span>
        </div>
        
        <div className="footer-links">
          <span className="footer-link">PRIVACY</span>
          <span className="footer-link">TERMS</span>
          <span className="footer-link">CONTACT</span>
        </div>
        
        <div className="footer-socials">
          <span style={{ cursor: 'pointer' }}>𝕏</span>
          <span style={{ cursor: 'pointer' }}>📷</span>
          <span style={{ cursor: 'pointer' }}>🌐</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
