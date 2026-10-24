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

   To use Google sign-in with PostgreSQL locally, start the database and API alongside the frontend:
   ```bash
   npm run dev:stack
   ```
   This requires Docker Desktop (or Docker Engine) with Compose. It starts the `db` and `api` services from `docker-compose.yml`, then starts Vite. The regular `npm run dev` command starts only the frontend and will show an API unavailable message if the backend is not running.

### Kubernetes deployment

The `k8s/` directory contains a Kustomize application with a Deployment, ClusterIP Service, Ingress, and runtime configuration ConfigMap. Build the same Docker image used locally, push it to a registry your cluster can access, and set that image in `k8s/deployment.yaml`:

```bash
docker build -t <registry>/<owner>/negotiateai:<tag> .
docker push <registry>/<owner>/negotiateai:<tag>
```

Replace `negotiateai:latest` in the Deployment with the image you pushed. Before applying, set the host in `k8s/ingress.yaml` to a DNS name routed to your ingress controller, and set `googleClientId` in `k8s/runtime-config.yaml` to your Google OAuth web client ID. The OAuth client's authorized JavaScript origin must match the Ingress URL, including `https://` when TLS is enabled.

Apply and check the resources with:

```bash
kubectl apply -k k8s/
kubectl rollout status deployment/negotiateai
kubectl get deployment,service,ingress -l app=negotiateai
```

The Ingress assumes an nginx ingress controller is installed. Add a TLS section and the matching TLS Secret to `k8s/ingress.yaml` when serving over HTTPS. This project is served as a static SPA behind nginx; `GEMINI_API_KEY` and `APP_URL` from `.env.example` are not Kubernetes runtime settings for this frontend. Never put private API keys in `runtime-config.js` or any browser-delivered configuration.

Google sign-in requests identity and Google Calendar access together. It sends the short-lived Google access token to `/api/auth/google`; the API validates it with Google, then stores the verified profile and login timestamps in the PostgreSQL `users` table. The nginx configuration forwards `/api/*` to the in-cluster `negotiateai-api` Service. Completed negotiations are stored in the same database under the signed-in user's email. Ensure the frontend nginx Pod and API Service share a Kubernetes namespace, and apply the API and PostgreSQL manifests before deploying the frontend.

---

## 📋 Features

- **Pre-built Negotiation Scenarios**: Enterprise Vendor SaaS Renewal, Senior AI Lead Job Offer, and Tripartite Capex Budget Allocation.
- **Agent Personality Tuning**: Customize agents with Aggressive, Collaborative, or Risk-Averse negotiation postures.
- **Real-Time Constraint Validation**: Automated checklist verifying quorum, objectives, and boundary walkaways before negotiation starts.
- **Interactive Arena & Human-in-the-Loop**: Observe turn-by-turn agent exchanges or step in to make counter-offers directly.
- **Google Calendar Synchronization**: Automatically schedule confirmed agreement review meetings to your Google Calendar.
- **Settlement & Compliance Reporting**: Detailed executive summaries and constraint verification matrices upon reaching an agreement.
