export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'voter';
  is_active: boolean;
  created_at: string;
  voter_profile?: {
    id: string;
    student_id: string;
    department: string;
    academic_year: string;
  };
}

export interface Candidate {
  id: string;
  election_id: string;
  name: string;
  manifesto?: string;
  symbol?: string;
  created_at: string;
}

export interface Election {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'published';
  created_by: string;
  created_at: string;
  candidates: Candidate[];
  total_eligible: number;
  total_voted: number;
}

export interface VoterProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  student_id: string;
  department: string;
  academic_year: string;
}

export interface VoterElectionStatus {
  election_id: string;
  is_eligible: boolean;
  status?: 'eligible' | 'authorized' | 'voted';
  can_vote: boolean;
}

export interface AuthorizeResponse {
  authorization_token: string;
  election_id: string;
  expires_at: string;
  message: string;
}

export interface VoteSubmitResponse {
  status: string;
  receipt_code: string;
  ballot_hash: string;
  election_id: string;
  timestamp: string;
  message: string;
}

export interface ReceiptVerification {
  receipt_code: string;
  status: string;
  election_id: string;
  election_title: string;
  ballot_hash: string;
  block_index?: number;
  block_hash?: string;
  timestamp: string;
}

export interface BlockTransaction {
  id: string;
  block_id: string;
  ballot_id: string;
  transaction_hash: string;
  created_at: string;
}

export interface Block {
  id: string;
  block_index: number;
  timestamp: string;
  previous_hash: string;
  data_hash: string;
  block_hash: string;
  transaction_count?: number;
  transactions?: BlockTransaction[];
}

export interface ChainValidation {
  is_valid: boolean;
  total_blocks: number;
  errors: string[];
  details: {
    block_index: number;
    block_hash: string;
    previous_hash: string;
    data_hash: string;
    transaction_count: number;
    is_valid: boolean;
    errors: string[];
  }[];
}

export interface BlockchainStats {
  total_blocks: number;
  total_transactions: number;
  latest_block_hash?: string;
  is_chain_valid: boolean;
}

export interface CandidateResult {
  candidate_id: string;
  name: string;
  symbol?: string;
  vote_count: number;
  percentage: number;
}

export interface ElectionResults {
  election_id: string;
  title: string;
  status: string;
  is_published: boolean;
  total_eligible: number;
  total_votes_cast: number;
  turnout_percentage: number;
  candidate_results: CandidateResult[];
}
