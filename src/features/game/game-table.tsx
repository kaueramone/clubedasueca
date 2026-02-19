'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playCard } from './actions'
import { cn } from '@/lib/utils'
import { getCardAssetPath, generateDeck, shuffleDeck, getTrickWinner, isValidMove, getCardSuit, getCardValue } from './utils'
import Image from 'next/image'

// Existing props: game, currentUser. New optional prop: isTraining
export function GameTable({ game, currentUser, isTraining = false }: { game?: any, currentUser?: any, isTraining?: boolean }) {
    // Mock initial state for training
    const initialTrainingState = isTraining ? {
        id: 'training',
        status: 'playing',
        stake: 0,
        game_players: [
            { user_id: 'human', position: 0, team: 'A', hand: [], profiles: { username: 'Você', avatar_url: null } },
            { user_id: 'bot1', position: 1, team: 'B', hand: [], profiles: { username: 'Bot - Manel', avatar_url: null } },
            { user_id: 'bot2', position: 2, team: 'A', hand: [], profiles: { username: 'Bot - Zé', avatar_url: null } },
            { user_id: 'bot3', position: 3, team: 'B', hand: [], profiles: { username: 'Bot - Quim', avatar_url: null } },
        ],
        current_trick_cards: [],
        current_turn: 0, // Human starts or random
        trump_card: null,
        rounds: [],
    } : game

    const [gameState, setGameState] = useState(initialTrainingState)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    // Audio refs
    const audioPlaceRef = useRef<HTMLAudioElement | null>(null)
    const audioShuffleRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        audioPlaceRef.current = new Audio('/audio/card-place-1.ogg')
        audioShuffleRef.current = new Audio('/audio/card-shuffle.ogg')

        if (isTraining) {
            startTrainingGame()
        }
    }, [])

    function playSound(type: 'place' | 'shuffle') {
        if (type === 'place' && audioPlaceRef.current) {
            audioPlaceRef.current.currentTime = 0
            audioPlaceRef.current.play().catch(e => console.log('Audio play failed', e))
        } else if (type === 'shuffle' && audioShuffleRef.current) {
            audioShuffleRef.current.currentTime = 0
            audioShuffleRef.current.play().catch(e => console.log('Audio play failed', e))
        }
    }

    const startTrainingGame = () => {
        playSound('shuffle')
        const deck = shuffleDeck(generateDeck())
        const trump = deck[deck.length - 1] // Last card is trump

        // Deal 10 cards to each of 4 players
        const hands = [
            deck.slice(0, 10),
            deck.slice(10, 20),
            deck.slice(20, 30),
            deck.slice(30, 40)
        ]

        setGameState((prev: any) => ({
            ...prev,
            trump_card: trump,
            game_players: prev.game_players.map((p: any, i: number) => ({
                ...p,
                hand: hands[i]
            }))
        }))
    }

    // Bot Logic Effect
    useEffect(() => {
        if (!isTraining || !gameState || gameState.status !== 'playing') return

        const currentPlayer = gameState.game_players.find((p: any) => p.position === gameState.current_turn)
        if (currentPlayer && currentPlayer.user_id.startsWith('bot')) {
            const timer = setTimeout(() => {
                makeBotMove(currentPlayer)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [gameState, isTraining])

    const makeBotMove = (bot: any) => {
        const hand = bot.hand
        const leadCard = gameState.current_trick_cards[0]?.card
        const leadSuit = leadCard ? getCardSuit(leadCard) : null

        // Simple Bot Logic
        const validCards = hand.filter((c: string) => isValidMove(c, hand, leadSuit))
        const cardToPlay = validCards.length > 0 ? validCards[Math.floor(Math.random() * validCards.length)] : hand[0]

        handleTrainingMove(bot.user_id, cardToPlay)
    }

    const handleTrainingMove = (playerId: string, card: string) => {
        playSound('place')
        setGameState((prev: any) => {
            const playerIndex = prev.game_players.findIndex((p: any) => p.user_id === playerId)
            const newHand = prev.game_players[playerIndex].hand.filter((c: string) => c !== card)

            const newTrick = [...prev.current_trick_cards, { player_id: playerId, card }]
            let nextTurn = (prev.current_turn + 1) % 4
            let rounds = prev.rounds
            let trickFinished = false
            let winnerId: string | null = null

            // Check if trick is full (4 cards)
            if (newTrick.length === 4) {
                trickFinished = true
                const trumpSuit = getCardSuit(prev.trump_card)
                winnerId = getTrickWinner(newTrick, trumpSuit)
                const winnerPlayer = prev.game_players.find((p: any) => p.user_id === winnerId)
                nextTurn = winnerPlayer.position // Winner starts next trick

                rounds = [...prev.rounds, {
                    winner: winnerId,
                    cards: newTrick,
                    points: newTrick.reduce((acc: number, c: any) => acc + getCardValue(c.card), 0)
                }]
            }

            return {
                ...prev,
                game_players: prev.game_players.map((p: any, i: number) =>
                    i === playerIndex ? { ...p, hand: newHand } : p
                ),
                current_trick_cards: trickFinished ? [] : newTrick,
                current_turn: nextTurn,
                rounds: rounds
            }
        })
    }

    // Realtime Subscription (Only if NOT training)
    useEffect(() => {
        if (isTraining) return

        const channel = supabase
            .channel(`game-${game.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game.id}` }, (payload) => {
                setGameState((prev: any) => {
                    const newState = { ...prev, ...payload.new }
                    if (newState.current_trick_cards?.length > prev.current_trick_cards?.length) {
                        playSound('place')
                    }
                    return newState
                })
            })
            // ... (rest of subscription)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [game?.id, supabase, isTraining])

    const myPlayer = gameState.game_players.find((p: any) => p.user_id === currentUser.id)
    if (!myPlayer) return <div>Access denied</div>

    const handlePlayCard = async (card: string) => {
        if (loading) return

        if (isTraining) {
            // Validate move
            const myHand = gameState.game_players[0].hand
            const leadCard = gameState.current_trick_cards[0]?.card
            const leadSuit = leadCard ? getCardSuit(leadCard) : null

            if (!isValidMove(card, myHand, leadSuit)) {
                alert("Jogada inválida! Deve assistir ao naipe.")
                return
            }

            if (gameState.current_turn !== 0) {
                alert("Não é a sua vez!")
                return
            }

            handleTrainingMove('human', card)
            return
        }

        setLoading(true)
        playSound('place')
        const res = await playCard(game.id, card)
        if (res?.error) {
            alert(res.error)
        }
        setLoading(false)
    }

    // Helper to render cards
    const renderCard = (card: string, onClick?: () => void, isOpponent = false) => {
        const src = getCardAssetPath(card)
        return (
            <div
                onClick={onClick}
                className={cn(
                    "relative transition-all select-none filter drop-shadow-md",
                    onClick ? "cursor-pointer hover:-translate-y-4 hover:scale-105 active:scale-95 z-0 hover:z-10" : "",
                    isOpponent ? "w-12 h-16 sm:w-16 sm:h-24" : "w-20 h-28 sm:w-24 sm:h-36"
                )}
            >
                <Image
                    src={src}
                    alt={card}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100px, 150px"
                    priority={!isOpponent}
                />
            </div>
        )
    }

    const renderCardBack = (rotate = false) => {
        return (
            <div className={cn(
                "relative w-12 h-16 sm:w-14 sm:h-20 filter drop-shadow-sm",
                rotate ? "rotate-90" : ""
            )}>
                <Image
                    src="/cards/card_back.png"
                    alt="Back"
                    fill
                    className="object-contain"
                />
            </div>
        )
    }

    return (
        <div className="relative h-full w-full bg-[#35654d] overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 select-none">
            {/* Background Images */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/mesa-horizontal.png"
                    alt="Table Background"
                    fill
                    className="object-cover hidden md:block"
                    priority
                />
                <Image
                    src="/images/mesa-vert.png"
                    alt="Table Background"
                    fill
                    className="object-cover md:hidden"
                    priority
                />
                {/* Texture overlay for better text contrast if needed, but keeping it light */}
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
            </div>

            {/* Top Player (Partner) */}
            <div className="absolute top-4 sm:top-8 flex flex-col items-center z-10">
                <div className="h-12 w-12 rounded-full border-2 border-white/50 bg-black/20 overflow-hidden mb-[-10px] z-20 shadow-lg relative">
                    {/* <Image src={...} /> */}
                    <div className="w-full h-full bg-gray-400" />
                </div>
                <div className="flex -space-x-8 sm:-space-x-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="transform scale-75 origin-top">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Left Player (Opponent) */}
            <div className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 flex flex-row items-center z-10">
                <div className="flex flex-col -space-y-12 sm:-space-y-14">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="transform -rotate-90 scale-75">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Right Player (Opponent) */}
            <div className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 flex flex-row items-center z-10">
                <div className="flex flex-col -space-y-12 sm:-space-y-14">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="transform rotate-90 scale-75">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Center (Table) */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                {/* Placeholder for played cards */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {gameState.current_trick_cards?.map((c: any, i: number) => {
                        // Simple positioning logic for played cards on table
                        // This is tricky. Ideally we map player position to screen coordinates.
                        // For now, simpler: just stack them slightly offset or use absolute positions if we knew who played.
                        // We can find player position from player_id
                        const player = gameState.game_players.find((p: any) => p.user_id === c.player_id)
                        const pos = player?.position
                        // Map position to rotation/translation
                        // 0 (Me): Bottom
                        // 1 (Left): Left
                        // 2 (Partner): Top
                        // 3 (Right): Right
                        // Note: positions are relative to game, but we need relative to ME.
                        // But for training, I am 0. So it matches.
                        // For real game, we need to rotate based on my position.

                        // Relative position calculation:
                        const myPos = myPlayer.position
                        const relativePos = (pos - myPos + 4) % 4

                        let style = {}
                        if (relativePos === 0) style = { transform: 'translateY(20px)' }
                        if (relativePos === 1) style = { transform: 'translateX(-20px) rotate(90deg)' }
                        if (relativePos === 2) style = { transform: 'translateY(-20px)' }
                        if (relativePos === 3) style = { transform: 'translateX(20px) rotate(-90deg)' }

                        return (
                            <div key={i} className="absolute transition-all duration-300" style={style}>
                                {renderCard(c.card, undefined, false)}
                                {/* Using renderCard but maybe smaller? */}
                            </div>
                        )
                    })}
                    {(!gameState.current_trick_cards || gameState.current_trick_cards.length === 0) && (
                        <span className="text-white/20 font-bold tracking-widest uppercase text-xs">Mesa</span>
                    )}
                </div>
            </div>

            {/* Bottom Player (Me) */}
            <div className="absolute bottom-4 sm:bottom-8 w-full flex flex-col items-center z-20">
                {/* My Hand */}
                <div className="flex -space-x-8 sm:-space-x-12 mb-6 px-4 py-2 hover:-space-x-6 sm:hover:-space-x-8 transition-all duration-300 ease-out perspective-1000">
                    {myPlayer.hand?.map((card: string, index: number) => {
                        // Fan effect calculation
                        const total = myPlayer.hand.length
                        const mid = (total - 1) / 2
                        const rotate = (index - mid) * 5 // degrees
                        const translateY = Math.abs(index - mid) * 5

                        return (
                            <div
                                key={card}
                                style={{
                                    transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
                                    zIndex: index
                                }}
                                className="transform-gpu transition-transform hover:!rotate-0 hover:!translate-y-[-20px] hover:!z-50"
                            >
                                {renderCard(card, () => handlePlayCard(card))}
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center gap-3 bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-xl">
                    <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-white overflow-hidden">
                        {myPlayer.profiles?.avatar_url && <Image src={myPlayer.profiles.avatar_url} alt="Me" width={40} height={40} className="object-cover" />}
                    </div>
                    <span className="text-white font-bold text-shadow-sm">{myPlayer.profiles?.username || 'Eu'}</span>
                    <div className="h-full w-px bg-white/20 mx-2" />
                    <span className="text-emerald-400 font-mono font-bold">€{gameState.stake || '0.00'}</span>
                    {/* Trump Indicator */}
                    {gameState.trump_card && (
                        <>
                            <div className="h-full w-px bg-white/20 mx-2" />
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-white/70 uppercase">Trunfo</span>
                                {renderCard(gameState.trump_card, undefined, true)}
                                {/* reusing renderCard but small */}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 cursor-wait">
                </div>
            )}

            {/* Status Overlay */}
            {gameState.status === 'waiting' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4 transform transition-all scale-100">
                        <div className="animate-spin mb-4 mx-auto w-8 h-8 border-4 border-ios-blue border-t-transparent rounded-full" />
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">A processar...</h2>
                        <p className="text-gray-500">A aguardar jogadores ou início do jogo.</p>
                        <div className="mt-4 flex justify-center gap-2">
                            {/* Avatars of connected players */}
                            {gameState.game_players.map((p: any) => (
                                <div key={p.user_id} className="w-8 h-8 rounded-full bg-gray-200 border border-white shadow-sm" title={p.profiles?.username} />
                            ))}
                            {Array.from({ length: 4 - (gameState.game_players?.length || 0) }).map((_, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300" />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
