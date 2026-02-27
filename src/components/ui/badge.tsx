import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'vip-bronze' | 'vip-silver' | 'vip-gold' | 'vip-platinum'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                {
                    "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80": variant === 'default',
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === 'secondary',
                    "border-transparent bg-danger text-danger-foreground shadow hover:bg-danger/80": variant === 'destructive',
                    "border-border text-foreground": variant === 'outline',

                    // VIP Tiers
                    "border-transparent bg-[#CD7F32] text-white shadow": variant === 'vip-bronze',
                    "border-transparent bg-[#C0C0C0] text-gray-900 shadow": variant === 'vip-silver',
                    "border-transparent bg-[#D4AF37] text-gray-900 shadow": variant === 'vip-gold',
                    "border-transparent bg-[#E5E4E2] text-gray-900 shadow": variant === 'vip-platinum',
                },
                className
            )}
            {...props}
        />
    )
}

export { Badge }
