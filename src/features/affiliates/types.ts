// ============================================
// Affiliate System Types
// ============================================

export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type CommissionType = 'revenue_share' | 'cpa'
export type CommissionStatus = 'pending' | 'approved' | 'paid'

export interface Affiliate {
    id: string
    user_id: string
    status: AffiliateStatus
    commission_model: CommissionType
    revenue_share_pct: number
    cpa_amount?: number
    total_earned: number
    total_paid: number
    created_at: string
    updated_at: string
    // Joined
    profile?: { username: string; email?: string }
}

export interface AffiliateLink {
    id: string
    affiliate_id: string
    code: string
    url?: string
    clicks: number
    registrations: number
    created_at: string
}

export interface AffiliateReferral {
    id: string
    affiliate_id: string
    referred_user_id: string
    link_id?: string
    is_qualified: boolean
    qualified_at?: string
    created_at: string
    // Joined
    referred_user?: { username: string }
}

export interface AffiliateCommission {
    id: string
    affiliate_id: string
    referral_id?: string
    amount: number
    source_type: string
    source_id?: string
    status: CommissionStatus
    paid_at?: string
    created_at: string
}
