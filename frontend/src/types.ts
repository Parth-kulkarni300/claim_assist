export interface DamageItem {
  part: string;
  damage_type: string;
  severity: 'minor' | 'moderate' | 'severe' | string;
}

export interface BreakdownItem {
  part: string;
  damage_type: string;
  severity: string;
  estimated_repair_cost_inr: number;
}

export interface VisionResult {
  damages: DamageItem[];
  uncertainties: string[];
  human_review_required: boolean;
}

export interface PricingResult {
  status: 'estimate_ready' | 'human_review' | string;
  total_repair_estimate_inr?: number;
  deductible_inr?: number;
  policy_limit_inr?: number;
  estimated_payout_inr?: number;
  known_damage_estimate_inr?: number;
  breakdown?: BreakdownItem[];
  reason?: string | string[];
  disclaimer?: string;
}

export interface Claim {
  id: string;
  customer_name: string;
  vehicle_number: string;
  image_filename: string | null;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  vision_result: VisionResult;
  pricing_result: PricingResult;
  report_text?: string;
  approved_amount: number | null;
  reject_reason: string | null;
  processed_at: string | null;
}
