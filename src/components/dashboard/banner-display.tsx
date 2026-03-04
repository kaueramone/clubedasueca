'use client'

import { useEffect, useState } from 'react'
import { getActiveBanners, trackBannerClick } from '@/features/banners/actions'
import { cn } from '@/lib/utils'

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

    const handleBannerClick = (banner: any) => {
        trackBannerClick(banner.id).catch(console.error)
        if (banner.link_url) {
            window.open(banner.link_url, '_blank')
        }
    }

    return (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-md group">
            <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {banners.map((banner, idx) => (
                    <div
                        key={banner.id || idx}
                        onClick={() => handleBannerClick(banner)}
                        className="relative w-full flex-shrink-0 cursor-pointer transition-transform hover:scale-[1.01] min-h-[140px] sm:min-h-[180px]"
                    >
                        {/* Display logic for responsive banner images */}
                        {banner.image_url && (
                            <div
                                className={cn(
                                    "absolute inset-0 bg-cover bg-center transition-opacity",
                                    banner.mobile_image_url ? "hidden sm:block" : "block"
                                )}
                                style={{ backgroundImage: `url(${banner.image_url})` }}
                            />
                        )}
                        {banner.mobile_image_url && (
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-opacity block sm:hidden"
                                style={{ backgroundImage: `url(${banner.mobile_image_url})` }}
                            />
                        )}
                    </div>
                ))}
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
