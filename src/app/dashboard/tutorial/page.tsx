'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ChevronRight, Play, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export default function TutorialPage() {
    const [step, setStep] = useState(0)

    const steps = [
        {
            title: "O Básico",
            description: "A Sueca joga-se com 4 jogadores, em equipas de 2. O objetivo é ganhar vazas (rondas) para somar 60+ pontos.",
            simulation: "basic"
        },
        {
            title: "Assistir ao Naipe",
            description: "Regra de Ouro: Se o primeiro jogador joga Copas, TODOS devem jogar Copas se tiverem. Se não tiverem, podem cortar (trunfo) ou baldar.",
            simulation: "suit"
        },
        {
            title: "O Trunfo",
            description: "O Trunfo ganha a qualquer outra carta. No exemplo, Espadas é trunfo. O Ás de Espadas ganha ao Ás de Copas.",
            simulation: "trump"
        }
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-ios-blue" />
                    Como Jogar
                </h1>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Visual Simulation Area */}
                <div className="relative aspect-square md:aspect-auto md:h-[500px] bg-[#35654d] rounded-2xl shadow-xl overflow-hidden flex flex-col items-center justify-center p-4 border-4 border-wood-800">
                    <Image src="/images/mesa-vert.png" alt="bg" fill className="object-cover opacity-50" />

                    {/* Dynamic Content based on Step */}
                    <TutorialSimulation step={steps[step].simulation} />
                </div>

                {/* Explanation Area */}
                <div className="flex flex-col justify-center space-y-6">
                    <div className="space-y-4">
                        <span className="text-ios-blue font-bold tracking-widest uppercase text-sm">Passo {step + 1}/{steps.length}</span>
                        <h2 className="text-3xl font-bold text-gray-900">{steps[step].title}</h2>
                        <p className="text-lg text-gray-600 leading-relaxed">{steps[step].description}</p>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={() => setStep(Math.max(0, step - 1))}
                            disabled={step === 0}
                            className="px-6 py-3 rounded-xl font-bold border border-gray-300 text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition"
                        >
                            Anterior
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="flex-1 px-6 py-3 rounded-xl font-bold bg-ios-blue text-white hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                            >
                                Próximo
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        ) : (
                            <Link
                                href="/dashboard/training"
                                className="flex-1 px-6 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                            >
                                Praticar Agora
                                <Play className="h-5 w-5" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-2">Hierarquia das Cartas (Pontos)</h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 text-center text-sm">
                    <CardRank card="A" pts={11} />
                    <CardRank card="7" pts={10} />
                    <CardRank card="K" pts={4} />
                    <CardRank card="J" pts={3} />
                    <CardRank card="Q" pts={2} />
                    <CardRank card="6" pts={0} />
                    <CardRank card="5" pts={0} />
                    <CardRank card="4" pts={0} />
                    <CardRank card="3" pts={0} />
                    <CardRank card="2" pts={0} />
                </div>
            </div>
        </div>
    )
}

function CardRank({ card, pts }: { card: string, pts: number }) {
    return (
        <div className="bg-white p-2 rounded-lg border border-blue-100 flex flex-col items-center">
            <span className="font-bold text-lg text-gray-800">{card}</span>
            <span className="text-xs text-gray-500">{pts} pts</span>
        </div>
    )
}

function TutorialSimulation({ step }: { step: string }) {
    // Simple mock simulation components
    if (step === 'basic') {
        return (
            <div className="relative w-full h-full flex items-center justify-center z-10 animate-in fade-in zoom-in duration-500">
                <div className="relative w-40 h-40">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 bg-black/50 text-white px-2 rounded-full text-xs">Parceiro</div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 bg-green-500 text-white px-2 rounded-full text-xs">Você</div>
                    <div className="absolute left-0 top-1/2 -translate-x-8 -translate-y-1/2 bg-red-500 text-white px-2 rounded-full text-xs">Rival</div>
                    <div className="absolute right-0 top-1/2 translate-x-8 -translate-y-1/2 bg-red-500 text-white px-2 rounded-full text-xs">Rival</div>

                    <div className="absolute inset-0 border-4 border-dashed border-white/30 rounded-full animate-spin-slow" />
                </div>
            </div>
        )
    }

    if (step === 'suit') {
        return (
            <div className="relative w-full h-full flex flex-col items-center justify-center z-10 gap-4">
                <div className="bg-white/90 p-4 rounded-xl text-center shadow-lg">
                    <p className="font-bold text-red-600 mb-2">Rodada de Copas (♥)</p>
                    <div className="flex gap-2 justify-center">
                        <div className="w-12 h-16 bg-white border border-gray-200 rounded flex items-center justify-center text-red-600 font-bold">A♥</div>
                        <div className="flex items-center text-gray-400">vs</div>
                        <div className="w-12 h-16 bg-white border-2 border-green-500 rounded flex items-center justify-center text-red-600 font-bold relative">
                            7♥
                            <div className="absolute -bottom-6 w-full text-center text-[10px] text-white bg-green-500 rounded-full px-1">Certo</div>
                        </div>
                        <div className="w-12 h-16 bg-gray-200 border border-gray-300 rounded flex items-center justify-center text-gray-400 font-bold relative opacity-50">
                            K♠
                            <div className="absolute -bottom-6 w-full text-center text-[10px] text-white bg-red-500 rounded-full px-1">Errado</div>
                        </div>
                    </div>
                </div>
                <p className="text-white text-sm text-center max-w-xs bg-black/50 p-2 rounded-lg backdrop-blur">
                    Se tem Copas, É OBRIGADO a jogar Copas.
                </p>
            </div>
        )
    }

    if (step === 'trump') {
        return (
            <div className="relative w-full h-full flex flex-col items-center justify-center z-10 gap-4">
                <div className="bg-white/90 p-4 rounded-xl text-center shadow-lg">
                    <p className="font-bold text-gray-800 mb-2">Trunfo: Espadas (♠)</p>
                    <div className="flex gap-4 justify-center items-center">
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-20 bg-white border border-gray-200 rounded flex items-center justify-center text-red-600 font-bold shadow-md">A♥</div>
                            <span className="text-xs font-bold mt-1 text-gray-600">11 pts</span>
                        </div>
                        <div className="text-4xl font-bold text-red-500">X</div>
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-20 bg-white border-2 border-yellow-400 rounded flex items-center justify-center text-black font-bold shadow-xl scale-110 z-10">2♠</div>
                            <span className="text-xs font-bold mt-1 text-yellow-600">TRUNFO (0 pts)</span>
                        </div>
                    </div>
                </div>
                <p className="text-white text-sm text-center max-w-xs bg-black/50 p-2 rounded-lg backdrop-blur">
                    Mesmo uma carta baixa de Trunfo (2♠) ganha ao Ás de outro naipe (A♥).
                </p>
            </div>
        )
    }

    return null
}
