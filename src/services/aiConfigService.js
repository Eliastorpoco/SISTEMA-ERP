import { getStoredToken } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.evolonline.online';

function getHeaders() {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function getAIConfig() {
  const res = await fetch(`${API_BASE}/ia/config`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function saveAIConfig(data) {
  const res = await fetch(`${API_BASE}/ia/config`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function testAIConnection(proveedor) {
  const res = await fetch(`${API_BASE}/ia/health`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function getUsageLog(days = 7) {
  const res = await fetch(`${API_BASE}/ia/config/usage?days=${days}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export const aiConfigService = {
  getConfig: getAIConfig,
  updateConfig: saveAIConfig,
  getUsage: getUsageLog,
  getHealth: testAIConnection
};
