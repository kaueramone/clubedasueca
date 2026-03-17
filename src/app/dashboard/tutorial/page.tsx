'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ChevronRight, ChevronLeft, Play, Trophy, Users, Zap, Shield, Star, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const CARD_VALUES = [
    { rank: 'A', pts: 11, label: 'Ás' },
    { rank: '7', pts: 10, label: 'Sete' },
    { rank: 'K', pts: 4, label: 'Rei' },
    { rank: 'J', pts: 3, label: 'Valete' },
    { rank: 'Q', pts: 2, label: 'Dama' },
    { rank: '6', pts: 0 },
    { rank: '5', pts: 0 },
    { rank: '4', pts: 0 },
    { rank: '3', pts: 0 },
    { rank: '2', pts: 0 },
]

const steps = [
    {
        badge: 'O Básico',
        title: 'Como Funciona',
        icon: <Users className="w-6 h-6" />,
        gradient: 'from-emerald-600 to-green-700',
        points: [
            '4 jogadores divididos em 2 equipas de 2.',
            'O teu parceiro senta-se sempre à tua frente.',
            'O objetivo: somar 60+ pontos em cartas ganhas.',
            'O jogo tem 10 vazas (rodadas) no total.',
        ],
    },
    {
        badge: 'Regra de Ouro',
        title: 'Assistir ao Naipe',
        icon: <Shield className="w-6 h-6" />,
        gradient: 'from-blue-600 to-indigo-700',
        points: [
            'O 1.º jogador define o naipe da vaza.',
            'Se tens cartas desse naipe, TENS de jogar uma.',
            'Se não tens, podes cortar com trunfo ou baldar.',
            'Baldar = jogar qualquer carta sem ganhar a vaza.',
        ],
    },
    {
        badge: 'Poder Máximo',
        title: 'O Trunfo',
        icon: <Zap className="w-6 h-6" />,
        gradient: 'from-yellow-500 to-amber-600',
        points: [
            'O trunfo é revelado no início de cada jogo.',
            'Qualquer carta do naipe trunfo ganha às outras.',
            'Se dois jogadores jogam trunfo, o mais alto vence.',
            'O 7 de trunfo é a 2.ª carta mais forte do jogo!',
        ],
    },
    {
        badge: 'Pontuação',
        title: 'Contar os Pontos',
        icon: <Trophy className="w-6 h-6" />,
        gradient: 'from-purple-600 to-violet-700',
        points: [
            'Só o Ás (11), 7 (10), Rei (4), Valete (3) e Dama (2) valem.',
            'Total de pontos possíveis por jogo: 120.',
            '60+ pontos = vitória da tua equipa.',
            'Sem pontos? Ganha quem jogou a carta mais forte.',
        ],
    },
]

export default function TutorialPage() {
    const [step, setStep] = useState(0)
    const current = steps[step]

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </Link>
                <BookOpen className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Como Jogar Sueca</h1>
            </div>

            {/* Step Progress Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                {steps.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                            i === step
                                ? 'bg-accent text-white border-accent shadow-md shadow-accent/30 scale-105'
                                : i < step
                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                                    : 'bg-muted text-muted-foreground border-border'
                        )}
                    >
                        {i < step ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>}
                        <span className="hidden sm:inline">{s.badge}</span>
                    </button>
                ))}
            </div>

            {/* Main Card */}
            <div className="rounded-2xl overflow-hidden shadow-xl border border-border">
                {/* Gradient Header */}
                <div className={cn("bg-gradient-to-r p-5 sm:p-6 text-white flex items-center gap-4", current.gradient)}>
                    <div className="bg-white/20 rounded-xl p-3 shrink-0">{current.icon}</div>
                    <div>
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                            {current.badge} · Passo {step + 1} de {steps.length}
                        </p>
                        <h2 className="text-xl sm:text-2xl font-black">{current.title}</h2>
                    </div>
                </div>

                {/* Two-column layout */}
                <div className="bg-card grid md:grid-cols-2">
                    {/* Visual */}
                    <div className="relative min-h-[260px] md:min-h-[340px] bg-[#2d5a3f] flex items-center justify-center overflow-hidden">
                        <Image src="/images/mesa-vert.png" alt="Mesa" fill className="object-cover opacity-25" />
                        <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
                            <TutorialSimulation step={step} />
                        </div>
                    </div>

                    {/* Text */}
                    <div className="p-6 flex flex-col justify-between gap-6">
                        <ul className="space-y-4">
                            {current.points.map((point, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className={cn(
                                        "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white mt-0.5 bg-gradient-to-br shadow-sm",
                                        current.gradient
                                    )}>
                                        {i + 1}
                                    </span>
                                    <p className="text-foreground leading-relaxed">{point}</p>
                                </li>
                            ))}
                        </ul>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setStep(s => Math.max(0, s - 1))}
                                disabled={step === 0}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors text-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>
                            {step < steps.length - 1 ? (
                                <button
                                    onClick={() => setStep(s => s + 1)}
                                    className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r shadow-lg text-sm transition-opacity hover:opacity-90", current.gradient)}
                                >
                                    Próximo <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <Link
                                    href="/dashboard/training"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg text-sm hover:opacity-90 transition"
                                >
                                    <Play className="w-4 h-4" />
                                    Praticar Agora!
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Hierarchy */}
            <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
                    <h3 className="font-black text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        Hierarquia das Cartas
                        <span className="hidden sm:inline text-sm font-normal text-slate-300 ml-1">— da mais forte para a mais fraca</span>
                    </h3>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
                        {CARD_VALUES.map((c, i) => (
                            <div
                                key={c.rank}
                                className={cn(
                                    "relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                                    i === 0 ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-600 ring-2 ring-yellow-400/30"
                                        : i === 1 ? "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-500"
                                            : i < 5 ? "bg-muted/50 border-border"
                                                : "bg-muted/20 border-border/40"
                                )}
                            >
                                {i < 2 && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap z-10">
                                        {i === 0 ? '★ 1.º' : '★ 2.º'}
                                    </span>
                                )}
                                <span className={cn(
                                    "font-black text-2xl mt-1",
                                    i === 0 ? "text-yellow-600 dark:text-yellow-400"
                                        : i === 1 ? "text-orange-600 dark:text-orange-400"
                                            : "text-foreground"
                                )}>{c.rank}</span>
                                <span className={cn(
                                    "text-[10px] font-bold",
                                    c.pts > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                )}>
                                    {c.pts > 0 ? `${c.pts} pts` : '—'}
                                </span>
                                {c.label && <span className="text-[8px] text-muted-foreground hidden lg:block">{c.label}</span>}
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground text-center">
                        💡 Cartas com <span className="font-bold text-emerald-600 dark:text-emerald-400">pontos a verde</span> valem para o marcador.
                        O <span className="font-bold text-foreground">7 é a 2.ª carta mais forte</span> — mais forte que o Rei!
                    </p>
                </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
                {[
                    { icon: '🎯', title: 'Dica Pro', text: 'Guarda o teu Ás para cortar uma vaza grande do adversário.' },
                    { icon: '🤝', title: 'Trabalho de Equipa', text: 'O parceiro está a ganhar? Não cortes — deixa-o ganhar a vaza.' },
                    { icon: '⚡', title: 'Trunfo com Cuidado', text: 'Não uses o trunfo cedo. Vale mais cortar uma vaza de 10+ pontos.' },
                ].map((tip, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-accent/30 transition-colors">
                        <p className="text-2xl mb-2">{tip.icon}</p>
                        <h4 className="font-bold text-foreground mb-1">{tip.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tip.text}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function TutorialSimulation({ step }: { step: number }) {
    if (step === 0) {
        return (
            <div className="relative w-48 h-48 animate-in fade-in zoom-in duration-500">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
                <div className="absolute inset-[25%] rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                    <span className="text-white/40 text-[10px] font-bold">MESA</span>
                </div>
                {/* Partner */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white font-bold text-sm shadow-lg">P</div>
                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Parceiro</span>
                </div>
                {/* Me */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 flex flex-col-reverse items-center gap-1">
                    <span className="bg-white text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full">Você</span>
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center text-emerald-700 font-bold text-sm shadow-lg">V</div>
                </div>
                {/* Left */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 flex items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-md">R</div>
                </div>
                {/* Right */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 flex items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-md">R</div>
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/50 whitespace-nowrap">
                    Equipa A (Verde) vs Equipa B (Vermelho)
                </div>
            </div>
        )
    }

    if (step === 1) {
        return (
            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
                    <p className="text-white/60 text-[10px] font-bold uppercase mb-3 tracking-widest">Naipe de Saída: Copas ♥</p>
                    <div className="flex items-end gap-2 justify-center">
                        {[
                            { face: 'A♥', ok: true, label: 'Saída' },
                            { face: '7♥', ok: true, label: '✓ Certo' },
                            { face: 'K♥', ok: true, label: '✓ Certo' },
                            { face: 'K♠', ok: false, label: '✗ Errado' },
                        ].map((card, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={cn(
                                    "w-11 h-15 rounded-lg flex items-center justify-center font-black text-base shadow-lg border-2",
                                    card.ok ? "bg-white text-red-600 border-green-400" : "bg-gray-200 text-gray-400 border-red-400 opacity-60",
                                )} style={{ height: '60px', width: '44px' }}>
                                    {card.face}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold px-1 py-0.5 rounded-full",
                                    card.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                )}>{card.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-white text-[11px] text-center bg-black/40 backdrop-blur px-4 py-2 rounded-lg max-w-[240px] border border-white/10">
                    Tens Copas? <span className="text-yellow-400 font-bold">OBRIGADO a jogar Copas!</span>
                </p>
            </div>
        )
    }

    if (step === 2) {
        return (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl px-4 py-2">
                    <p className="text-yellow-300 text-sm font-black text-center">Trunfo: ♠ Espadas</p>
                </div>
                <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center gap-1">
                        <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center text-red-600 font-black text-2xl shadow-lg" style={{ width: '56px', height: '76px' }}>A♥</div>
                        <span className="text-white/70 text-[10px] font-bold">11 pts</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-red-400 text-3xl font-black">×</span>
                        <span className="text-white/40 text-[9px]">perde</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10">
                            TRUNFO!
                        </div>
                        <div className="bg-white rounded-lg border-2 border-yellow-400 flex items-center justify-center text-gray-900 font-black text-2xl shadow-xl scale-110" style={{ width: '56px', height: '76px' }}>2♠</div>
                        <span className="text-yellow-300 text-[10px] font-bold">0 pts</span>
                    </div>
                </div>
                <p className="text-white/70 text-[11px] text-center bg-black/40 backdrop-blur px-4 py-2 rounded-lg max-w-[240px] border border-white/10">
                    O 2 de Espadas <span className="text-yellow-400 font-bold">ganha ao Ás de Copas</span> porque é trunfo.
                </p>
            </div>
        )
    }

    if (step === 3) {
        return (
            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-[10px] font-bold uppercase mb-3 tracking-widest text-center">Cartas com Pontos</p>
                    <div className="flex gap-1.5 items-end justify-center">
                        {[
                            { face: 'A', pts: 11, highlight: true },
                            { face: '7', pts: 10 },
                            { face: 'K', pts: 4 },
                            { face: 'J', pts: 3 },
                            { face: 'Q', pts: 2 },
                        ].map((c, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={cn(
                                    "bg-white rounded-lg flex items-center justify-center font-black text-gray-800 border shadow-md",
                                    c.highlight ? "text-lg border-yellow-400 ring-2 ring-yellow-400/30" : "text-base border-gray-200",
                                )} style={{ width: c.highlight ? '48px' : '40px', height: c.highlight ? '64px' : '54px' }}>
                                    {c.face}
                                </div>
                                <span className="text-emerald-400 text-[10px] font-bold">{c.pts}pt</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-5 py-3 text-center">
                        <p className="text-emerald-400 text-2xl font-black">60+</p>
                        <p className="text-white/60 text-[10px] font-bold">= Vitória</p>
                    </div>
                    <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-5 py-3 text-center">
                        <p className="text-red-400 text-2xl font-black">≤59</p>
                        <p className="text-white/60 text-[10px] font-bold">= Derrota</p>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
