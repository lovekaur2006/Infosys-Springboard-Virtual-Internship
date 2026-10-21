# NegotiateAI — Multi-Agent Negotiation & Calendar Scheduling Platform

An interactive multi-agent negotiation simulation and arbitration platform built for the **Infosys Springboard Virtual Internship**. The application enables users to select realistic negotiation scenarios, configure AI agent personas and constraints, run dynamic bilateral/tripartite negotiations, and synchronize agreed sessions directly with Google Calendar.

---

## 🛠️ Tech Stack

### Frontend & Core
- **React 19** (`react`, `react-dom`): Modern reactive UI architecture with Hooks.
- **TypeScript 5/7**: Strict static typing for agent configurations, turn dialogues, and settlement schemas.
- **Vite 8**: Next-generation frontend tooling and rapid development server.

### Styling & Animation
- **Tailwind CSS v4** (`@tailwindcss/vite`, `tailwindcss`): Modern utility-first styling with sleek dark/light mode palettes.
- **Lucide React** (`lucide-react`): Consistent, lightweight icons.
- **Motion** (`motion`): Fluid micro-interactions, stepper transitions, and turn-by-turn dialogue animations.

### AI & Negotiation Services
- **Google GenAI SDK** (`@google/genai`): Gemini API integration for dynamic AI agent dialogue and counter-proposals.
- **Autonomous Rule Engine**: Built-in multi-round negotiation orchestrator with personality matrices (Aggressive, Collaborative, Risk-Averse), leverage scoring, and settlement constraint validation.

### Authentication & Integrations
- **Google Identity Services (GIS)** & **Google OAuth 2.0**: Secure authentication for Google Calendar integration (`calendar.events` scope).
- **Google Calendar API v3**: Direct scheduling, confirmation, and sync for finalized negotiation sessions.
- **Kubernetes deployment**: Containerized static frontend with runtime OAuth configuration.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **bun**

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lovekaur2006/Infosys-Springboard-Virtual-Internship.git
   cd Infosys-Springboard-Virtual-Internship
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory (refer to `.env.example`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   For Google Calendar, set `VITE_GOOGLE_CLIENT_ID` in `.env.local`, or configure `googleClientId` in `runtime-config.js` for a container deployment. The OAuth client ID is public; do not put private API keys in the frontend bundle.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Kubernetes deployment

Build and publish the frontend image, then update the image name in `k8s/deployment.yaml`:

```bash
docker build -t your-registry/negotiateai:latest .
docker push your-registry/negotiateai:latest
kubectl apply -f k8s/
```

Set the Google OAuth client ID in `k8s/runtime-config.yaml` before applying. Configure the OAuth client's authorized JavaScript origin to match the hostname exposed by your Ingress. The app runs as a static SPA behind nginx; no Firebase service is required.

---

## 📋 Features

- **Pre-built Negotiation Scenarios**: Enterprise Vendor SaaS Renewal, Senior AI Lead Job Offer, and Tripartite Capex Budget Allocation.
- **Agent Personality Tuning**: Customize agents with Aggressive, Collaborative, or Risk-Averse negotiation postures.
- **Real-Time Constraint Validation**: Automated checklist verifying quorum, objectives, and boundary walkaways before negotiation starts.
- **Interactive Arena & Human-in-the-Loop**: Observe turn-by-turn agent exchanges or step in to make counter-offers directly.
- **Google Calendar Synchronization**: Automatically schedule confirmed agreement review meetings to your Google Calendar.
- **Settlement & Compliance Reporting**: Detailed executive summaries and constraint verification matrices upon reaching an agreement.
