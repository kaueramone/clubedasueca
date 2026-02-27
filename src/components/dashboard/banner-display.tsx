'use client'

import { useEffect, useState } from 'react'
import { getActiveBanners, trackBannerClick } from '@/features/banners/actions'

export function BannerDisplay({ position = 'dashboard_top' }: { position?: string }) {
    const [banners, setBanners] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        // Load active banners
        getActiveBanners(position).then(res => {
            if (res.banners) setBanners(res.banners)
        })
    }, [position])

    useEffect(() => {
        // Auto-rotate if multiple banners
        if (banners.length <= 1) return
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [banners])

    if (banners.length === 0) return null

    const banner = banners[currentIndex]

    const handleBannerClick = () => {
        trackBannerClick(banner.id).catch(console.error)
        if (banner.link_url) {
            window.open(banner.link_url, '_blank')
        }
    }

    return (
        <div
            onClick={handleBannerClick}
            className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-primary shadow-md cursor-pointer group transition-transform hover:scale-[1.01]"
        >
            {banner.image_url ? (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay transition-opacity group-hover:opacity-80"
                    style={{ backgroundImage: `url(${banner.image_url})` }}
                />
            ) : null}

            <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-center min-h-[120px]">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 shadow-sm drop-shadow-md">
                    {banner.title}
                </h3>
                {banner.description && (
                    <p className="text-primary-foreground/90 max-w-2xl drop-shadow-md">
                        {banner.description}
                    </p>
                )}
            </div>

            {/* Dots for multiple banners */}
            {banners.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                    {banners.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx) }}
                            className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
