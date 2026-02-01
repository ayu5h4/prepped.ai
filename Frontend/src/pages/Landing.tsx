import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css'; // Use the main app's stylesheet
import { Cpu, Star, Zap, Eye } from 'lucide-react';

const Landing: React.FC = () => {
  // Force dark theme for this page
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    // Cleanup on component unmount
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  return (
    <div className="landing-page-container">
      {/* 1. TOP NAVIGATION */}
      <nav className="top-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="brand">
          <Cpu size={24} />
          prepped.ai
        </div>
        <div className="nav-actions">
          <Link to="/login" className="glass-button secondary">Sign In</Link>
        </div>
      </nav>

      {/* 2. MAIN CONTENT - Vertically Stacked Sections */}
      <main className="landing-main-content">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row-reverse items-center justify-between gap-12 max-w-6xl mx-auto">
          {/* Column 2: Typography (Code comes first for mobile stacking) */}
          <div className="w-full md:w-1/2 text-left">
            <h1 className="hero-title">Master Your Interview Before It Happens.</h1>
            <p className="hero-subtitle">
              Stop practicing with generic questions. Prepped.ai reads your resume and the job description to conduct a hyper-realistic, voice-to-voice technical interview tailored to the role you want.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="glass-button primary large">Start Mock Interview</Link>
              <a href="#how-it-works" className="glass-button secondary large">Learn More</a>
            </div>
          </div>
          
          {/* Column 1: Visual Container */}
          <div className="w-full md:w-1/2 h-[400px] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl" />
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="landing-section">
          <h2 className="section-title">How It Works</h2>
          <div className="how-steps-grid">
            <div className="step-card">
              <h3>1. Upload & Target</h3>
              <p>Upload your PDF resume and paste the Job Description (JD) of the role you are applying for.</p>
            </div>
            <div className="step-card">
              <h3>2. The Interview</h3>
              <p>The AI starts the session, asking specifically about your projects and their requirements. Speak naturally to reply.</p>
            </div>
            <div className="step-card">
              <h3>3. The Feedback</h3>
              <p>Receive a detailed breakdown of your performance, highlighting where you shined and what you need to study.</p>
            </div>
          </div>
        </section>

        {/* Features/Why Us Section */}
        <section className="landing-section">
          <h2 className="section-title">Why Prepped.ai is Different</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Zap size={24} /></div>
              <h3>Context-Aware Intelligence</h3>
              <p>Analyzes the gaps between your resume and the JD to find your weak spots—just like a real hiring manager.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Star size={24} /></div>
              <h3>Voice-First Pressure Testing</h3>
              <p>Forces you to articulate thoughts out loud, helping you build confidence and eliminate filler words.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Eye size={24} /></div>
              <h3>Instant Performance Analytics</h3>
              <p>Get an instant report card on Technical Accuracy, Communication, and STAR Method compliance.</p>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <footer className="landing-footer">
          <h2 className="section-title">Built with a "Free Forever" Architecture</h2>
          <div className="tech-stack-items">
            <span><strong>Brain:</strong> Google Gemini 1.5 Flash</span>
            <span><strong>Voice:</strong> Edge-TTS & Web Speech API</span>
            <span><strong>Core:</strong> Python (FastAPI) & React</span>
          </div>
        </footer>
      </main>

      <style>{`
        .landing-page-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          min-height: 100vh;
          background-color: #020617; /* bg-slate-950 */
        }
        .landing-main-content {
          display: flex;
          flex-direction: column;
          gap: 4rem; /* my-16 */
          width: 100%;
          max-width: 1024px; /* max-w-5xl */
          margin: 0 auto; /* mx-auto */
          padding: 2rem 1rem;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-primary);
          margin: 0 0 16px;
        }
        .hero-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin: 0 0 24px;
        }
        .hero-cta {
          display: flex;
          gap: 16px;
        }
        .glass-button.large {
          padding: 14px 28px;
          font-size: 1rem;
        }

        .landing-section {
          text-align: center;
        }
        .section-title {
          font-size: 2.2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 32px;
        }

        /* Reverted to multi-column grid for cards */
        .how-steps-grid, .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          text-align: left;
        }
        .step-card, .feature-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow);
          padding: 24px;
          border-radius: 16px;
        }
        .feature-card {
          text-align: center;
        }
        .feature-icon {
          margin-bottom: 16px;
          color: var(--accent-color);
        }
        
        .step-card h3, .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 8px;
        }
        .step-card p, .feature-card p {
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .landing-footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid var(--glass-border);
        }
        /* Reverted to row for tech stack */
        .tech-stack-items {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 24px;
          color: var(--text-secondary);
        }

        @media (max-width: 900px) {
          .hero-cta {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default Landing;
