import {
  User,
  Election,
  Candidate,
  VoterProfile,
  VoterElectionStatus,
  AuthorizeResponse,
  VoteSubmitResponse,
  ReceiptVerification,
  Block,
  ChainValidation,
  BlockchainStats,
  ElectionResults
} from '../types';

const API_BASE = '/api/v1';

export function getStoredToken(): string | null {
  return localStorage.getItem('votechain_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('votechain_token', token);
}

export function clearStoredToken() {
  localStorage.removeItem('votechain_token');
  localStorage.removeItem('votechain_user');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Client-Side AES-256-GCM Encryption Helper using Web Crypto API.
 * Encrypts ballot payload without exposing voter identity.
 */
export async function encryptBallotForElection(
  candidateId: string,
  electionId: string
): Promise<string> {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({
    candidate_id: candidateId,
    election_id: electionId,
    timestamp: new Date().toISOString(),
    nonce: crypto.randomUUID()
  });

  // Derive pseudo-key using SHA-256 of master salt + electionId for client payload
  // (Backend decrypts with election-derived key)
  // For demonstration: Derive 256-bit key from election context
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: encoder.encode('votechain_election_salt_v1'),
      info: encoder.encode(`election_${electionId}`),
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoder.encode(payload)
  );

  // Combine IV (12 bytes) + Ciphertext and Tag
  const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuffer), iv.length);

  // Convert to Base64
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export const api = {
  // Auth
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  registerVoter: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  registerAdmin: (data: any) => request<any>('/auth/register-admin', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<User>('/auth/me'),

  // Voter
  getVoterProfile: () => request<any>('/voters/me'),
  getEligibleElections: () => request<Election[]>('/voters/elections'),
  getVoterStatus: (electionId: string) => request<VoterElectionStatus>(`/voters/elections/${electionId}/status`),
  getCandidates: (electionId: string) => request<Candidate[]>(`/voters/elections/${electionId}/candidates`),

  // Voting
  authorizeVote: (electionId: string) => request<AuthorizeResponse>(`/voting/authorize/${electionId}`, { method: 'POST' }),
  submitBallot: (data: { election_id: string; authorization_token: string; encrypted_vote: string }) =>
    request<VoteSubmitResponse>('/voting/submit', { method: 'POST', body: JSON.stringify(data) }),
  verifyReceipt: (receiptCode: string) => request<ReceiptVerification>(`/voting/receipt/${receiptCode}`),

  // Admin
  createElection: (data: any) => request<Election>('/admin/elections', { method: 'POST', body: JSON.stringify(data) }),
  getAdminElections: () => request<Election[]>('/admin/elections'),
  getAdminElection: (id: string) => request<Election>(`/admin/elections/${id}`),
  updateElection: (id: string, data: any) => request<Election>(`/admin/elections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addCandidate: (electionId: string, data: any) =>
    request<Candidate>(`/admin/elections/${electionId}/candidates`, { method: 'POST', body: JSON.stringify(data) }),
  getRegisteredVoters: () => request<VoterProfile[]>('/admin/voters'),
  assignEligibleVoters: (electionId: string, voterIds: string[]) =>
    request<{ message: string }>(`/admin/elections/${electionId}/voters`, { method: 'POST', body: JSON.stringify({ voter_ids: voterIds }) }),
  getElectionVoters: (electionId: string) => request<VoterProfile[]>(`/admin/elections/${electionId}/voters`),
  activateElection: (electionId: string) => request<{ message: string }>(`/admin/elections/${electionId}/activate`, { method: 'POST' }),
  closeElection: (electionId: string) => request<{ message: string }>(`/admin/elections/${electionId}/close`, { method: 'POST' }),
  publishResults: (electionId: string) => request<ElectionResults>(`/admin/elections/${electionId}/publish`, { method: 'POST' }),

  // Blockchain
  getChain: () => request<Block[]>('/blockchain/chain'),
  getBlock: (index: number) => request<Block>(`/blockchain/blocks/${index}`),
  validateChain: () => request<ChainValidation>('/blockchain/validate'),
  getBlockchainStats: () => request<BlockchainStats>('/blockchain/stats'),
  getTransaction: (hash: string) => request<any>(`/blockchain/transactions/${hash}`),

  // Results
  getResults: (electionId: string) => request<ElectionResults>(`/results/${electionId}`),
  getTurnout: (electionId: string) => request<any>(`/results/${electionId}/turnout`),
  getCandidateResults: (electionId: string) => request<any[]>(`/results/${electionId}/candidates`),
};
