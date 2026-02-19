'use client'

import React from 'react'

import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'

export default function TutorialPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Como Jogar Sueca</h1>
                </div>
            </div>

            {/* Introduction */}
            <div className="prose prose-lg max-w-none bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <p className="lead text-xl text-gray-600">
                    A Sueca é um jogo de cartas popular em Portugal e no Brasil, jogado por 4 jogadores em duplas.
                    O objetivo é ganhar vazas (rodadas) que contêm cartas valiosas para somar pontos.
                </p>
            </div>

            {/* Card Values */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-ios-blue">Hierarquia e Pontos</h2>
                    <p className="text-gray-500 mb-4">A ordem das cartas (do maior para o menor) e seus valores:</p>

                    <ul className="space-y-3">
                        <li className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-bold text-lg">Ás (A)</span>
                            <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">11 Pontos</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-bold text-lg">7 (Manilha)</span>
                            <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">10 Pontos</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-bold text-lg">Rei (K)</span>
                            <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">4 Pontos</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-bold text-lg">Valete (J)</span>
                            <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">3 Pontos</span>
                        </li>
                        <li className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-bold text-lg">Dama (Q)</span>
                            <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">2 Pontos</span>
                        </li>
                        <li className="flex justify-between items-center pt-2">
                            <span className="text-gray-500">6, 5, 4, 3, 2</span>
                            <span className="bg-gray-100 text-gray-500 font-bold px-3 py-1 rounded-full text-sm">0 Pontos</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-ios-orange">Regras Principais</h2>
                    <ul className="space-y-4 text-gray-700">
                        <li className="flex gap-3">
                            <span className="font-bold text-ios-orange">1.</span>
                            <span>Os jogadores jogam em parceiros sentados frente a frente.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-ios-orange">2.</span>
                            <span>O jogo é jogado no sentido horário.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-ios-orange">3.</span>
                            <span>É <strong>obrigatório assistir</strong> ao naipe puxado. Se não tiver cartas desse naipe, pode jogar qualquer outra carta (inclusive trunfo).</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-ios-orange">4.</span>
                            <span>Se for jogado um <strong>trunfo</strong>, ele ganha de qualquer carta que não seja trunfo maior.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-ios-orange">5.</span>
                            <span>A equipa que fizer mais de 60 pontos ganha a rodada (4 pontos de jogo). Se fizer 91+, ganha 2 pontos. Se fizer 120 (todas as vazas), ganha 4 pontos.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center pt-8">
                <Link
                    href="/dashboard/play"
                    className="bg-[#35654d] text-white font-bold py-4 px-12 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center gap-3 text-lg"
                >
                    Vamos Jogar!
                </Link>
            </div>
        </div>
    )
}
