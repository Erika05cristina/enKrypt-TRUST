<template>
  <div class="docs-page">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>

    <nav class="glass-nav">
      <router-link to="/" class="logo-link">
        <span class="logo">T.R.U.S.T <span>Agent</span></span>
      </router-link>
      <div class="nav-links">
        <router-link to="/">Home</router-link>
        <a href="#overview">Overview</a>
        <a href="#stack">Stack</a>
        <a href="#erc8004">ERC-8004</a>
        <a href="#x402">x402 &amp; API</a>
        <a href="#extension">Extension</a>
        <a href="#roadmap">Roadmap</a>
      </div>
    </nav>

    <main class="docs-main">
      <header class="docs-hero">
        <p class="eyebrow">Documentation</p>
        <h1>T.R.U.S.T <span>technical reference</span></h1>
        <p class="lead">
          In-wallet risk checks on <strong>Avalanche Fuji</strong>, paid deep analysis via
          <strong>ThirdWeb x402</strong>, and a discoverable agent aligned with
          <strong>EIP-8004</strong> (Trustless Agents).
        </p>
        <div class="hero-actions">
          <a
            href="https://github.com/Erika05cristina/enKrypt-TRUST/blob/main/docs/trust/technical.md"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary"
          >
            📋 Read Full Technical.md
          </a>
          <a
            href="https://github.com/Erika05cristina/enKrypt-TRUST"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary"
          >
            Source on GitHub
          </a>
        </div>
      </header>

      <section id="overview" class="doc-section">
        <h2>Overview</h2>
        <div class="glass-card prose">
          <p>
            <strong>TRUST</strong> (Transaction Risk &amp; User Security Toolkit) extends a fork of
            <a href="https://github.com/enkryptcom/enKrypt" target="_blank" rel="noopener">Enkrypt</a>
            so users get a <strong>risk score before signing</strong> EVM transactions on Avalanche testnet
            (<code>chainId</code> 43113).
          </p>
          <ul>
            <li><strong>Local rules</strong> in the extension for fast, free screening.</li>
            <li>
              <strong>Paid backend</strong> (<code>trust-risk-api</code>) for bytecode, explorer data,
              B3 scoring, optional Solidity static scan, and optional LLM evidence — unlocked with HTTP
              <strong>402 Payment Required</strong> (x402).
            </li>
            <li>
              <strong>Agent identity</strong> per EIP-8004: registration JSON and optional
              <code>erc8004</code> metadata on successful paid responses; on-chain
              <code>register</code> / <code>setAgentURI</code> are performed by the <strong>operator</strong>,
              not by API keys inside the server.
            </li>
          </ul>
        </div>
      </section>

      <section id="stack" class="doc-section">
        <h2>Technology stack</h2>
        <div class="grid-cards">
          <div class="glass-card">
            <h3>Client</h3>
            <p>Vue 3, Vite, wallet extension UI, orchestration before <code>eth_sendTransaction</code>.</p>
          </div>
          <div class="glass-card">
            <h3>Chain</h3>
            <p>Avalanche C-Chain Fuji, USDC (EIP-3009) for x402 settlements via ThirdWeb facilitator.</p>
          </div>
          <div class="glass-card">
            <h3>Backend</h3>
            <p>Node API: risk pipeline, Routescan-style explorer, optional Ollama, x402 verify/settle.</p>
          </div>
          <div class="glass-card">
            <h3>Standards</h3>
            <p>EIP-8004 discoverability, HTTP x402 micropayments, JSON risk contracts under <code>docs/trust/</code>.</p>
          </div>
        </div>
      </section>

      <section id="erc8004" class="doc-section">
        <h2>ERC-8004 &amp; agents</h2>
        <div class="glass-card prose">
          <p>
            <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noopener">EIP-8004</a>
            defines trustless agent identity (e.g. Identity Registry). TRUST exposes a stable
            <code>GET /agent-registration.json</code> from the risk API and, when configured, includes an
            <code>erc8004</code> block on paid <code>200</code> responses. The wallet can show registry links
            in <strong>TrustPanel</strong> without changing scoring logic.
          </p>
          <p class="muted">
            Fuji reference deployments (verify on-chain): IdentityRegistry
            <code>0x8004A818BFB912233c491871b3d84c89A494BD9e</code>, ReputationRegistry
            <code>0x8004B663056A597Dffe9eCcC1965A193B7388713</code>.
          </p>
          <p>
            <strong>Note:</strong> EIP-8004 does not define payment rails — x402 is the complementary layer
            for per-call USDC payment on the same agent surfaces.
          </p>
        </div>
      </section>

      <section id="x402" class="doc-section">
        <h2>x402 &amp; risk API</h2>
        <div class="glass-card prose">
          <ol class="steps-list">
            <li>Extension <code>POST</code>s to <code>/api/risk-check</code> or <code>/api/risk-check/deep</code>.</li>
            <li>Server responds with <strong>402</strong> + <code>accepts</code> (exact scheme, capped amount).</li>
            <li>User signs EIP-3009 authorization; client retries with payment header.</li>
            <li>Facilitator settles USDC; API runs probes and returns <strong>200</strong> + B3-style scores and flags.</li>
          </ol>
          <p>
            <code>TRUST_PUBLIC_BASE_URL</code> must match the URL the client uses for the second request. JSON
            request/response shapes live in the repo under <code>docs/trust/contracts/</code>.
          </p>
        </div>
      </section>

      <section id="extension" class="doc-section">
        <h2>Wallet extension flow</h2>
        <div class="glass-card prose">
          <ol class="steps-list">
            <li>DApp triggers signing; extension intercepts calldata and target contract.</li>
            <li>Deterministic client engine assigns quick risk or escalates to the API.</li>
            <li>x402 handshake runs; paid path merges explorer, static scan, and optional LLM into the verdict.</li>
            <li>UI blocks or warns per threshold; ERC-8004 metadata is displayed when present.</li>
          </ol>
        </div>
      </section>

      <section id="roadmap" class="doc-section roadmap-section">
        <h2>Roadmap &amp; value</h2>
        <p class="section-lead">
          Where we are headed — anchored on real architecture (x402, B3, explorer, optional LLM, EIP-8004)
          and deliberate scope boundaries from our technical spec.
        </p>

        <div class="glass-card prose roadmap-value-intro">
          <h3 class="roadmap-subhead">Why this solution matters</h3>
          <p>
            Most users only see a confirmation screen. <strong>TRUST moves judgment before the signature</strong>:
            cheap local screening for everyday flows, and a <strong>metered deep path</strong> when bytecode,
            verified source, static rules, and optional AI evidence are worth paying for. That combination cuts
            phishing and drainer patterns without forcing a subscription or blind trust in a black-box API.
          </p>
          <p>
            <strong>Value stack:</strong> users keep custody (they sign x402 / EIP-3009); the backend proves work
            per request; <strong>EIP-8004</strong> makes the agent <em>discoverable</em> and attributable on-chain
            while registration keys stay with the <strong>operator</strong> — clearer roles and a smaller server
            attack surface than “the API owns the agent NFT.”
          </p>
        </div>

        <div class="value-pillars">
          <div class="glass-card pillar">
            <span class="pillar-icon" aria-hidden="true">🛡️</span>
            <h4>Defense in depth</h4>
            <p>Local heuristics + paid pipeline (RPC, explorer, B3, Solidity scan, LLM) — escalate only when needed.</p>
          </div>
          <div class="glass-card pillar">
            <span class="pillar-icon" aria-hidden="true">⚡</span>
            <h4>Pay per insight</h4>
            <p>x402 aligns cost with actual analysis; no prepaid credits that obscure true pricing.</p>
          </div>
          <div class="glass-card pillar">
            <span class="pillar-icon" aria-hidden="true">🔗</span>
            <h4>Standards-native</h4>
            <p>HTTP 402, EIP-3009 settlement, EIP-8004 registration JSON — composable with wallets and indexers.</p>
          </div>
          <div class="glass-card pillar">
            <span class="pillar-icon" aria-hidden="true">🧭</span>
            <h4>Operator-owned identity</h4>
            <p>On-chain <code>register</code> / <code>setAgentURI</code> outside the Node process; API echoes trust metadata, not custody.</p>
          </div>
        </div>

        <div class="roadmap-track">
          <article class="glass-card roadmap-item roadmap-item--now">
            <span class="phase phase-now">Live</span>
            <h3>Hackathon baseline — Fuji</h3>
            <p class="roadmap-blurb">
              End-to-end story: wallet intercept → orchestrator → optional x402 → merged score in UI, plus demos and public docs.
            </p>
            <ul class="roadmap-list">
              <li><strong>In-wallet</strong> flow with <code>orchestrateRiskAssessment</code>, TrustPanel, and demo landing routes.</li>
              <li><strong>x402</strong> on standard + deep <code>POST</code> endpoints; facilitator-settled USDC on testnet.</li>
              <li><strong>Backend pipeline:</strong> B3, <code>eth_getCode</code>, explorer source metadata, static Solidity scan, optional Ollama blend.</li>
              <li><strong>EIP-8004:</strong> <code>GET /agent-registration.json</code>, optional <code>erc8004</code> on paid <code>200</code> responses.</li>
              <li><strong>Contracts</strong> documented under <code>docs/trust/contracts/</code> for integrators.</li>
            </ul>
          </article>

          <article class="glass-card roadmap-item roadmap-item--next">
            <span class="phase phase-next">Next</span>
            <h3>Production hardening</h3>
            <p class="roadmap-blurb">
              Turn the prototype into something you can run 24/7: stable URLs, observability, and safer defaults.
            </p>
            <ul class="roadmap-list">
              <li>Lock <code>TRUST_PUBLIC_BASE_URL</code> to the live host; CORS and payment header checks reviewed per environment.</li>
              <li><strong>Operator runbook:</strong> Fuji/mainnet gas, <code>setAgentURI</code> pointing at HTTPS registration JSON (no localhost in prod).</li>
              <li><strong>Rate limits &amp; abuse controls</strong> on expensive paths; structured logs and metrics for 402 → 200 funnel.</li>
              <li>Expand automated tests (API + orchestrator) and CI gates; document failure modes and retries.</li>
              <li><strong>Policy gates:</strong> restore business rules for when to call the paid API (vs demo “force paid” overrides).</li>
            </ul>
          </article>

          <article class="glass-card roadmap-item roadmap-item--mid">
            <span class="phase phase-mid">Grow</span>
            <h3>Scale, chains &amp; ecosystem</h3>
            <p class="roadmap-blurb">
              Broaden who can rely on the agent: more networks, fresher data, and cleaner integration surfaces.
            </p>
            <ul class="roadmap-list">
              <li><strong>Avalanche C-Chain mainnet</strong> readiness: RPC, USDC, facilitator config, and explicit x402 pricing per network.</li>
              <li>Multi-RPC failover, caching for explorer metadata, clearer SLAs on latency-sensitive steps.</li>
              <li><strong>Read-only</strong> use of Reputation Registry or similar signals where they improve scores — without automatic on-chain writes from the API.</li>
              <li>Versioned API surface, changelog, and a small <strong>integration guide</strong> for third-party wallets or dApps (not only Enkrypt).</li>
              <li>Landing + <code>/docs</code> kept in sync with shipped behavior; optional OpenAPI or JSON Schema publish pipeline.</li>
            </ul>
          </article>

          <article class="glass-card roadmap-item roadmap-item--long">
            <span class="phase phase-long">Vision</span>
            <h3>Depth, trust &amp; enterprise</h3>
            <p class="roadmap-blurb">
              Longer horizons that need product decisions — we call them out explicitly so roadmap stays honest.
            </p>
            <ul class="roadmap-list">
              <li><strong>LLM governance:</strong> model versioning, prompt regression suites, optional human review queue for contested verdicts.</li>
              <li>Richer static-analysis packs, partner-specific rule sets, and <strong>white-label</strong> agent branding on registration JSON.</li>
              <li><strong>Formal security review</strong>, bug bounty, and privacy posture doc (what leaves the wallet vs the server).</li>
              <li>Advanced EIP-8004 flows (e.g. Validation Registry / heavier proofs) only where they clear cost–benefit — today marked out-of-scope in our spec.</li>
              <li>Optional <strong>session keys</strong> or delegated UX for power users; <strong>enterprise</strong> policies, audit trails, SIEM hooks — if a team adopts TRUST org-wide.</li>
              <li>On-chain <strong>reputation writes</strong> tied to each analysis only if we deliberately accept that trust model (currently excluded to limit liability and coupling).</li>
            </ul>
          </article>
        </div>
      </section>

      <footer class="docs-footer">
        <router-link to="/" class="btn btn-primary">← Back to landing</router-link>
        <p class="muted small">Vue 3 • Avalanche • ThirdWeb x402 • EIP-8004 • TRUST</p>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.docs-page {
  --bg-color: #0b0e14;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --primary: #8b5cf6;
  --primary-glow: rgba(139, 92, 246, 0.5);
  --secondary: #10b981;
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);

  font-family: 'Outfit', sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 48px;
}

.blob {
  position: fixed;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.45;
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
  background: #3b82f6;
  top: 40%;
  left: 50%;
  border-radius: 50%;
  animation-delay: 4s;
}

@keyframes float {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(30px, 50px) scale(1.1);
  }
}

.glass-nav {
  position: sticky;
  top: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 40px;
  background: rgba(11, 14, 20, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--glass-border);
  z-index: 100;
  box-sizing: border-box;
  flex-wrap: wrap;
  gap: 12px;
}

.logo-link {
  text-decoration: none;
  color: inherit;
}

.logo {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
}
.logo span {
  color: var(--primary);
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.2s ease;
}
.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--primary);
}

.docs-main {
  position: relative;
  z-index: 1;
  max-width: 880px;
  margin: 0 auto;
  padding: 48px 24px 0;
}

.docs-hero {
  margin-bottom: 48px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 12px;
  color: var(--secondary);
  font-weight: 700;
  margin: 0 0 12px;
}

.docs-hero h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2rem, 5vw, 2.75rem);
  line-height: 1.15;
  margin: 0 0 16px;
}
.docs-hero h1 span {
  color: var(--primary);
}

.lead {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0 0 24px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn {
  padding: 12px 22px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 20px var(--primary-glow);
  border: none;
}
.btn-primary:hover {
  transform: translateY(-2px);
}
.btn-secondary {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
}
.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.doc-section {
  margin-bottom: 56px;
  scroll-margin-top: 88px;
}

.doc-section h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.65rem;
  margin: 0 0 20px;
  color: #fff;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.prose p,
.prose ul,
.prose ol {
  color: var(--text-muted);
  line-height: 1.65;
  margin: 0 0 14px;
}
.prose ul,
.prose ol {
  padding-left: 1.25rem;
}
.prose li {
  margin-bottom: 8px;
}
.prose a {
  color: #c4b5fd;
}
.prose code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.9em;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 6px;
  border-radius: 6px;
  color: #e9d5ff;
}

.muted {
  color: var(--text-muted);
}
.small {
  font-size: 14px;
}

.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}
.grid-cards h3 {
  margin: 0 0 10px;
  font-size: 1.05rem;
  color: #fff;
}
.grid-cards p {
  margin: 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.55;
}

.steps-list {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text-muted);
  line-height: 1.7;
}
.steps-list li {
  margin-bottom: 10px;
}

.section-lead {
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 720px;
  margin: -8px 0 28px;
}

.roadmap-value-intro {
  margin-bottom: 24px;
}
.roadmap-value-intro .roadmap-subhead {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.2rem;
  color: #fff;
  margin: 0 0 12px;
}
.roadmap-value-intro p:last-child {
  margin-bottom: 0;
}

.value-pillars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}
.pillar {
  padding: 20px 22px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.pillar:hover {
  border-color: rgba(139, 92, 246, 0.35);
  box-shadow: 0 0 28px rgba(139, 92, 246, 0.08);
}
.pillar-icon {
  display: block;
  font-size: 1.75rem;
  margin-bottom: 10px;
  line-height: 1;
}
.pillar h4 {
  margin: 0 0 8px;
  font-size: 1rem;
  color: #fff;
  font-weight: 700;
}
.pillar p {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.55;
}

.roadmap-track {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-left: 22px;
}
.roadmap-track::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(
    180deg,
    var(--secondary) 0%,
    var(--primary) 45%,
    rgba(59, 130, 246, 0.5) 75%,
    rgba(156, 163, 175, 0.25) 100%
  );
  border-radius: 2px;
}

.roadmap-item {
  position: relative;
  padding: 28px 26px 26px 28px;
  margin-left: 8px;
}
.roadmap-item::before {
  content: '';
  position: absolute;
  left: -21px;
  top: 32px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bg-color);
  border: 2px solid var(--secondary);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.35);
  z-index: 1;
}
.roadmap-item--next::before {
  border-color: var(--primary);
  box-shadow: 0 0 12px var(--primary-glow);
}
.roadmap-item--mid::before {
  border-color: #3b82f6;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.35);
}
.roadmap-item--long::before {
  border-color: #6b7280;
  box-shadow: none;
}

.phase {
  position: absolute;
  top: 18px;
  right: 22px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.phase-now {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
}
.phase-next {
  color: #e9d5ff;
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.35);
}
.phase-mid {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
}
.phase-long {
  color: #d1d5db;
  background: rgba(107, 114, 128, 0.15);
  border-color: rgba(107, 114, 128, 0.35);
}

.roadmap-item h3 {
  margin: 0 0 10px;
  padding-right: 100px;
  font-size: 1.25rem;
  font-family: 'Space Grotesk', sans-serif;
  color: #fff;
  line-height: 1.25;
}
.roadmap-blurb {
  margin: 0 0 14px;
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 15px;
}
.roadmap-list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-muted);
  line-height: 1.65;
  font-size: 14px;
}
.roadmap-list li {
  margin-bottom: 10px;
}
.roadmap-list li:last-child {
  margin-bottom: 0;
}
.roadmap-list strong {
  color: #e5e7eb;
  font-weight: 600;
}

@media (max-width: 600px) {
  .roadmap-item h3 {
    padding-right: 0;
    padding-top: 28px;
  }
  .phase {
    top: 14px;
    right: 16px;
  }
}

.docs-footer {
  text-align: center;
  padding: 40px 0 20px;
  border-top: 1px solid var(--glass-border);
  margin-top: 32px;
}
.docs-footer .btn-primary {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .glass-nav {
    padding: 14px 18px;
  }
  .nav-links {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
