const API_BASE_URL = "http://localhost:3001";

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
  const response = await fetch(`${API_BASE_URL}/api/negotiations`, {
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