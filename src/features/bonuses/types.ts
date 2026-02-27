// ============================================
// Bonus System Types
// ============================================

export type BonusType = 'welcome' | 'deposit_match' | 'reload' | 'free_play' | 'cashback' | 'promo_code' | 'vip_reward'
export type BonusStatus = 'active' | 'paused' | 'expired'
export type UserBonusStatus = 'active' | 'completed' | 'expired' | 'cancelled'

export interface Bonus {
    id: string
    name: string
    description?: string
    type: BonusType
    amount?: number
    percentage?: number
    max_amount?: number
    min_deposit?: number
    rollover_multiplier: number
    valid_days: number
    max_uses?: number
    current_uses: number
    max_per_user: number
    user_segment: string
    status: BonusStatus
    created_at: string
    updated_at: string
    expires_at?: string
}

export interface UserBonus {
    id: string
    user_id: string
    bonus_id: string
    amount: number
    wagered: number
    rollover_target: number
    status: UserBonusStatus
    activated_at: string
    expires_at?: string
    completed_at?: string
    // Joined
    bonus?: Bonus
}

export interface VipLevel {
    id: number
    name: string
    min_points: number
    cashback_rate: number
    bonus_multiplier: number
    benefits: string[]
    color: string
    icon: string
    sort_order: number
}

export interface UserVip {
    id: string
    user_id: string
    level_id: number
    points: number
    lifetime_points: number
    updated_at: string
    // Joined
    level?: VipLevel
}

export interface PromoCode {
    id: string
    code: string
    bonus_id: string
    max_redemptions?: number
    current_redemptions: number
    valid_from: string
    valid_until?: string
    is_active: boolean
    created_at: string
    // Joined
    bonus?: Bonus
}
