const API_BASE_URL = "/api";

export async function syncGoogleUser(accessToken: string) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch {
    throw new Error('The user API is unreachable. In local development, run "npm run dev:stack"; in Kubernetes, check that the negotiateai-api Pods are ready and the /api route points to their Service.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(`The user API is unavailable (HTTP ${response.status}). In local development, run "npm run dev:stack"; in Kubernetes, check that the negotiateai-api Pods are ready and the /api route points to their Service.`);
    }
    throw new Error(`Failed to sync user profile (${response.status}): ${errorText}`);
  }

  return response.json();
}

interface SaveNegotiationData {
  userEmail: string;
  scenarioId: string;
  scenarioTitle: string;
  agents: unknown[];
  turns: unknown[];
  settlement: {
    status: string;
    agreementScore?: number;
    [key: string]: unknown;
  };
}

export async function saveNegotiation(data: SaveNegotiationData) {
  const response = await fetch(`${API_BASE_URL}/negotiations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to save negotiation (${response.status}): ${errorText}`
    );
  }

  return response.json();
}
