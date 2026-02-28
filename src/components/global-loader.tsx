'use client'

export function GlobalLoader({ isVisible = true }: { isVisible?: boolean }) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <style>{`
                @keyframes fan1 {
                    0% { transform: rotate(0deg) translateY(0); }
                    100% { transform: rotate(-45deg) translateY(10px) translateX(-20px); }
                }
                @keyframes fan2 {
                    0% { transform: rotate(0deg) translateY(0); }
                    100% { transform: rotate(-15deg) translateY(-10px) translateX(-5px); }
                }
                @keyframes fan3 {
                    0% { transform: rotate(0deg) translateY(0); }
                    100% { transform: rotate(15deg) translateY(-10px) translateX(5px); }
                }
                @keyframes fan4 {
                    0% { transform: rotate(0deg) translateY(0); }
                    100% { transform: rotate(45deg) translateY(10px) translateX(20px); }
                }
                .fan-card {
                    position: absolute;
                    transform-origin: bottom center;
                    transition: all 0.5s ease-in-out;
                }
                .animate-fan-1 { animation: fan1 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
                .animate-fan-2 { animation: fan2 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
                .animate-fan-3 { animation: fan3 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
                .animate-fan-4 { animation: fan4 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
            `}</style>

            <div className="relative w-32 h-40 flex items-center justify-center mb-8">
                {/* Leque de cartas animado */}
                <div className="fan-card animate-fan-1">
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center shadow-2xl border border-gray-200">
                        <span className="text-red-600 font-bold text-3xl">♥️</span>
                    </div>
                </div>
                <div className="fan-card animate-fan-2">
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center shadow-2xl border border-gray-200">
                        <span className="text-black font-bold text-3xl">♠️</span>
                    </div>
                </div>
                <div className="fan-card animate-fan-3">
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center shadow-2xl border border-gray-200">
                        <span className="text-red-600 font-bold text-3xl">♦️</span>
                    </div>
                </div>
                <div className="fan-card animate-fan-4">
                    <div className="w-16 h-24 bg-white rounded-lg flex items-center justify-center shadow-2xl border border-gray-200">
                        <span className="text-black font-bold text-3xl">♣️</span>
                    </div>
                </div>
            </div>
            <p className="text-white font-bold text-xl tracking-[0.2em] animate-pulse">A CARREGAR...</p>
        </div>
    )
}
