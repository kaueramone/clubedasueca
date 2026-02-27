import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    {
                        // Primary (Dourado Premium)
                        "bg-accent text-accent-foreground shadow-premium hover:bg-accent/90": variant === 'primary',
                        // Secondary (Verde)
                        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90": variant === 'secondary',
                        // Outline
                        "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground": variant === 'outline',
                        // Danger
                        "bg-danger text-danger-foreground shadow-sm hover:bg-danger/90": variant === 'danger',
                        // Ghost
                        "hover:bg-accent/20 hover:text-accent": variant === 'ghost',
                    },
                    {
                        "h-9 px-4 py-2": size === 'default',
                        "h-8 rounded-md px-3 text-xs": size === 'sm',
                        "h-10 rounded-md px-8": size === 'lg',
                        "h-9 w-9": size === 'icon',
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
