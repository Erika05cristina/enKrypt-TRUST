<template>
  <div class="home-container">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>

    <nav class="glass-nav">
      <div class="logo">T.R.U.S.T <span>Agent</span></div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#architecture">How it works</a>
        <a href="#demos">Demos</a>
        <a href="#team">Team</a>
        <a href="https://github.com/Erika05cristina/enKrypt-TRUST/tree/main/docs/trust" target="_blank">Docs</a>
      </div>
    </nav>

    <header class="hero">
      <div class="hero-content">
        <div class="badge">Avalanche 🔺 + ThirdWeb x402</div>
        <!-- Main Logo Integration -->
        <img src="/logo.png" alt="T.R.U.S.T Logo" style="width: 380px; border-radius: 104px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 25px; display: block; box-shadow: 0 15px 35px rgba(139, 92, 246, 0.25); object-fit: cover;" />
        <h1 class="glitch" data-text="The First In-Wallet AI Security Agent">The First In-Wallet <br><span class="highlight">AI Security Agent</span></h1>
        <p class="subtitle">T.R.U.S.T intercepts malicious smart contracts <i>before</i> you sign. Powered by deterministic analysis and pay-per-use deep LLM probes.</p>
        
        <div class="cta-group" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 25px;">
          <a href="#architecture" class="btn btn-primary" style="margin: 0;">See the Architecture 🚀</a>
          <a href="#" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; margin: 0;">
            <img src="/logo-av.png" alt="Avalanche" style="height: 20px;" /> Built on Avalanche
          </a>
          <a href="https://youtube.com/" target="_blank" class="btn btn-outline" style="border: 2px solid #8B5CF6; color: white; background: rgba(139, 92, 246, 0.1); padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; margin: 0; box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);">
            ▶ Watch Pitch
          </a>
        </div>
      </div>
      
      <div class="hero-visual">
        <div class="glass-card mockup-card">
          <div class="card-header">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="title">Wallet Transaction</span>
          </div>
          <div class="card-body">
            <div class="mock-tx">
              <p>Send: <strong>100 AVAX</strong></p>
              <p>To: 0xUnknownMalicious...</p>
            </div>
            <div class="trust-alert">
              <span class="icon">🛡️</span>
              <div>
                <strong>T.R.U.S.T Intercepted</strong>
                <p>LLM Verdict: <span class="text-red">MALICIOUS</span></p>
              </div>
            </div>
            <button class="btn-disabled" disabled>Send Request (Blocked)</button>
          </div>
        </div>
      </div>
    </header>

    <section id="features" class="features">
      <h2>Supercharged by <span>AI & x402</span></h2>
      <div class="grid">
        <div class="glass-card feature-card">
          <div class="feature-icon">🧩</div>
          <h3>Native Wallet Injection</h3>
          <p>No external websites needed. T.R.U.S.T lives natively inside your wallet extension, acting as a mandatory middleware before any JSON-RPC signature on Avalanche networks.</p>
        </div>

        <div class="glass-card feature-card">
          <div class="feature-icon">💸</div>
          <h3>ThirdWeb x402 Payments</h3>
          <p>Why pay for standard local analysis? We implemented the <strong>Payment Required (402)</strong> protocol on Avalanche. You only pay USDC when querying our deep backend Risk Engine.</p>
        </div>

        <div class="glass-card feature-card">
          <div class="feature-icon">🧠</div>
          <h3>Deep LLM Probes</h3>
          <p>Our backend fetches unverified bytecode and feeds it to a dedicated LLM securely. It analyzes functions, detects unlimited approvals, and returns a human-readable verdict.</p>
        </div>
      </div>
    </section>

    <section id="architecture" class="architecture">
      <h2>How it <span>Works</span></h2>
      <div class="timeline">
        <div class="glass-card step">
          <div class="step-num">1</div>
          <h4>DApp triggers eth_sendTransaction</h4>
          <p>The user clicks "Send" on Uniswap or any DApp. The wallet intercepts the raw hex payload.</p>
        </div>
        <div class="timeline-arrow">⬇</div>
        <div class="glass-card step">
          <div class="step-num">2</div>
          <h4>Client-Side Deterministic Engine</h4>
          <p>Vue.js Orchestrator quickly decodes the Calldata. If it's a simple transfer, it gives a <strong>Low Risk</strong> score locally. If it detects a suspicious contract, it triggers the API.</p>
        </div>
        <div class="timeline-arrow">⬇</div>
        <div class="glass-card step highlight-step">
          <div class="step-num">3</div>
          <h4>x402 Handshake & AI Analysis</h4>
          <p>The Extension hits the backend. The backend replies with <strong>402 Payment Required</strong>. The extension automatically pays. The backend then downloads the Blockchain Bytecode, passes it to the AI, and returns the verdict to the UI!</p>
        </div>
      </div>
    </section>

    <section id="use-cases" class="use-cases">
      <h2>Use <span>Cases</span></h2>
      <div class="grid">
        <div class="glass-card use-card">
          <h3>🎣 Anti-Phishing</h3>
          <p>Prevents users from interacting with fake DApps by analyzing domain reputation, origin, and target contract history locally.</p>
        </div>
        <div class="glass-card use-card">
          <h3>🛑 Stopping Drainers</h3>
          <p>Intercepts silent <strong>Unlimited Approval</strong> requests, the #1 cause of lost funds in Web3, and forces strict LLM review.</p>
        </div>
        <div class="glass-card use-card">
          <h3>🐛 Zero-Day Prevention</h3>
          <p>Catches malicious functions on completely new, unverified smart contracts by having an LLM read the compiled decompiled code.</p>
        </div>
      </div>
    </section>

    <section id="demos" class="demos">
      <h2>Live <span>Demos</span></h2>
      <p class="demo-subtitle">For this Hackathon presentation, we prepared 3 interactive smart contract scenarios on Avalanche:</p>
      <div class="demo-list">
        <div class="glass-card demo-item">
          <div class="demo-badge caution">Demo 1: Caution</div>
          <h4>The Unknown Protocol 🧩</h4>
          <p>A newly deployed interaction. No transaction history found to trust it 100%. <br><i>Result:</i> Proceed with Caution. <strong class="text-yellow">Score 45/100 (Caution)</strong>.</p>
          <router-link to="/safe" class="btn btn-primary" style="margin-top: 15px; font-size: 14px; text-decoration: none;">Launch Unknown DApp</router-link>
        </div>
        
        <div class="glass-card demo-item">
          <div class="demo-badge danger">Demo 2: High Risk</div>
          <h4>The Wallet Drainer 💀</h4>
          <p>A malicious script attempting to request an unauthorized transaction disguised as an Airdrop. <br><i>Result:</i> AI intercept + x402 payment. <strong class="text-red">Score 90/100 (Malicious)</strong>.</p>
          <router-link to="/high-risk" class="btn btn-primary" style="margin-top: 15px; font-size: 14px; text-decoration: none;">Launch Drainer DApp</router-link>
        </div>
        
        <div class="glass-card demo-item">
          <div class="demo-badge safe">Demo 3: Trusted</div>
          <h4>The Everyday Protocol 🦄</h4>
          <p>A standard interaction with a <strong>Verified Organization</strong> like Uniswap or Aave, used daily by millions. <br><i>Result:</i> Fast local processing. <strong class="text-green">Score 5/100 (100% Trusted)</strong>.</p>
        </div>
      </div>
    </section>

    <!-- Team Section -->
    <section id="team" class="team">
      <h2>The <span>Builders</span></h2>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 400px)); justify-content: center;">
        <div class="glass-card use-card">
          <img src="../assets/erika.jpg" alt="Erika Villa" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid rgba(139, 92, 246, 0.5); box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);" />
          <h3>Erika Villa</h3>
          <p style="color: #9CA3AF;">Wallet Extension, Frontend & Orchestrator</p>
        </div>
        <div class="glass-card use-card">
          <img src="../assets/anthony.jpeg" alt="Anthony Benavides" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid rgba(16, 185, 129, 0.5); box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);" />
          <h3>Anthony Benavides</h3>
          <p style="color: #9CA3AF;">Backend Risk API, x402 & LLM Evidence</p>
        </div>
      </div>
    </section>

    <footer>
      <p>Built with 🩵 for the Hackathon</p>
      <p class="tech-stack">Vue 3 • TypeScript • Avalanche • ThirdWeb • AI LLMs</p>
    </footer>
  </div>
</template>

<style scoped>
.home-container {
  --bg-color: #0B0E14;
  --text-main: #F3F4F6;
  --text-muted: #9CA3AF;
  --primary: #8B5CF6; /* Neon Purple */
  --primary-glow: rgba(139, 92, 246, 0.5);
  --secondary: #10B981; /* Cyber Green */
  --danger: #EF4444;
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);

  font-family: 'Outfit', sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 20px;
}

/* Background Animated Blobs */
.blob {
  position: fixed;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.5;
  animation: float 10s ease-in-out infinite alternate;
}
.blob-1 {
  width: 400px;
  height: 400px;
  background: var(--primary);
  top: -100px;
  left: -100px;
  border-radius: 50%;
}
.blob-2 {
  width: 300px;
  height: 300px;
  background: var(--secondary);
  bottom: -50px;
  right: -50px;
  border-radius: 50%;
  animation-delay: 2s;
}
.blob-3 {
  width: 250px;
  height: 250px;
  background: #3B82F6;
  top: 40%;
  left: 50%;
  border-radius: 50%;
  animation-delay: 4s;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 50px) scale(1.1); }
}

/* Glassmorphism Utilities */
.glass-nav {
  position: fixed;
  top: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 50px;
  background: rgba(11, 14, 20, 0.7);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--glass-border);
  z-index: 100;
  box-sizing: border-box;
}

.logo {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
}
.logo span {
  color: var(--primary);
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  margin-left: 30px;
  font-weight: 600;
  transition: color 0.3s ease;
}
.nav-links a:hover {
  color: var(--primary);
}

/* Hero Section */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 100vh;
  padding: 0 10%;
  margin-top: 60px;
  position: relative;
  z-index: 1;
}

.hero-content {
  flex: 1;
  max-width: 600px;
}

.badge {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #FCA5A5;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
}

h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 56px;
  line-height: 1.1;
  margin: 0 0 20px 0;
}
h1 .highlight {
  background: linear-gradient(90deg, var(--primary), #D8B4FE);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #D8B4FE;
  text-shadow: 0 0 30px var(--primary-glow);
}

.subtitle {
  font-size: 18px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 40px;
}

.btn {
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-block;
}
.btn-primary {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 20px var(--primary-glow);
  margin-right: 15px;
  border: none;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px var(--primary-glow);
}
.btn-secondary {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Glass Card */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

/* Mockup UI */
.hero-visual {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}
.mockup-card {
  width: 350px;
  transform: perspective(1000px) rotateY(-10deg) rotateX(5deg);
  transition: transform 0.5s ease;
}
.mockup-card:hover {
  transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
}
.card-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}
.dot.red { background: #FF5F56; }
.dot.yellow { background: #FFBD2E; }
.dot.green { background: #27C93F; }
.card-header .title {
  margin-left: auto;
  font-size: 14px;
  color: var(--text-muted);
}
.mock-tx {
  background: rgba(0,0,0,0.2);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.mock-tx p { margin: 5px 0; font-size: 14px; }
.trust-alert {
  display: flex;
  align-items: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.trust-alert .icon { font-size: 24px; margin-right: 15px; }
.trust-alert p { margin: 5px 0 0 0; font-size: 12px; }
.text-red { color: var(--danger); font-weight: bold; }
.btn-disabled {
  width: 100%;
  padding: 12px;
  background: #374151;
  color: #9CA3AF;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: not-allowed;
}

/* Sections */
section {
  padding: 100px 10%;
  position: relative;
  z-index: 1;
}
h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 40px;
  text-align: center;
  margin-bottom: 60px;
}
h2 span {
  color: var(--primary);
}

/* Features Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}
.feature-card {
  transition: transform 0.3s ease, border-color 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-10px);
  border-color: var(--primary);
}
.feature-icon {
  font-size: 40px;
  margin-bottom: 20px;
}
.feature-card h3 {
  font-size: 22px;
  margin-bottom: 15px;
}
.feature-card p {
  color: var(--text-muted);
  line-height: 1.6;
}

/* Architecture Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 600px;
  margin: 0 auto;
}
.step {
  width: 100%;
  position: relative;
  padding-left: 80px;
  margin-bottom: 20px;
  box-sizing: border-box;
}
.step-num {
  position: absolute;
  left: 30px;
  top: 30px;
  width: 40px;
  height: 40px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  box-shadow: 0 0 15px var(--primary-glow);
}
.step h4 { margin: 0 0 10px 0; font-size: 20px; }
.step p { margin: 0; color: var(--text-muted); line-height: 1.5; }
.timeline-arrow {
  font-size: 24px;
  color: var(--text-muted);
  margin-bottom: 20px;
  opacity: 0.5;
}
.highlight-step {
  border-color: var(--secondary);
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);
}
.highlight-step .step-num {
  background: var(--secondary);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
}

/* Footer */
footer {
  text-align: center;
  padding: 40px;
  border-top: 1px solid var(--glass-border);
  margin-top: 50px;
  position: relative;
  z-index: 1;
}
footer p { color: var(--text-muted); }
.tech-stack {
  font-size: 14px;
  opacity: 0.7;
  letter-spacing: 2px;
  margin-top: 10px;
}

/* Use Cases and Demos */
.use-card {
  text-align: center;
  padding: 40px 20px;
}
.use-card h3 {
  font-size: 22px;
  margin-bottom: 15px;
  color: #fff;
}

.demos {
  text-align: center;
}
.demo-subtitle {
  color: var(--text-muted);
  font-size: 18px;
  margin-bottom: 40px;
}
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}
.demo-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  position: relative;
  overflow: hidden;
}
.demo-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: bold;
  font-family: 'Space Grotesk', sans-serif;
  border-bottom-left-radius: 12px;
}
.demo-badge.safe { background: var(--secondary); color: #000; }
.demo-badge.danger { background: var(--danger); color: #fff; }
.demo-badge.caution { background: #FFBD2E; color: #000; }

.demo-item h4 {
  font-size: 20px;
  margin: 0 0 10px 0;
  color: var(--primary);
}
.demo-item p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}
.text-green { color: var(--secondary); }
.text-yellow { color: #FFBD2E; }

@media (max-width: 900px) {
  .hero { flex-direction: column; text-align: center; justify-content: center; margin-top: 100px; }
  .hero-visual { margin-top: 60px; justify-content: center; }
  .mockup-card { transform: none; }
  h1 { font-size: 40px; }
  .nav-links { display: none; }
}
</style>
