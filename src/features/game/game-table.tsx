'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playCard } from './actions'
import { cn } from '@/lib/utils'
import { getCardAssetPath, generateDeck, shuffleDeck, getTrickWinner, isValidMove, getCardSuit, getCardValue } from './utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trophy, Home, RotateCcw } from 'lucide-react'

// Existing props: game, currentUser. New optional prop: isTraining
export function GameTable({ game, currentUser, isTraining = false }: { game?: any, currentUser?: any, isTraining?: boolean }) {
    const router = useRouter()

    // Mock initial state for training
    const initialTrainingState = isTraining ? {
        id: 'training',
        status: 'playing',
        stake: 0,
        game_players: [
            { user_id: 'human', position: 0, team: 'A', hand: [], profiles: { username: 'Você', avatar_url: null } },
            { user_id: 'bot1', position: 1, team: 'B', hand: [], profiles: { username: 'Manel (Bot)', avatar_url: null } },
            { user_id: 'bot2', position: 2, team: 'A', hand: [], profiles: { username: 'Zé (Bot)', avatar_url: null } },
            { user_id: 'bot3', position: 3, team: 'B', hand: [], profiles: { username: 'Quim (Bot)', avatar_url: null } },
        ],
        current_trick_cards: [],
        current_turn: 0, // Human starts or random
        trump_card: null,
        rounds: [],
    } : game

    const [gameState, setGameState] = useState(initialTrainingState)
    const [loading, setLoading] = useState(false)
    const [scores, setScores] = useState({ A: 0, B: 0 })
    const [lastRoundResult, setLastRoundResult] = useState<{ winner: string, points: number, team: string } | null>(null)
    const [gameResult, setGameResult] = useState<{ winnerTeam: string, scoreA: number, scoreB: number } | null>(null)
    const [isTrickProcessing, setIsTrickProcessing] = useState(false) // Lock game during trick transition

    // Audio refs
    const audioPlaceRef = useRef<HTMLAudioElement | null>(null)
    const audioShuffleRef = useRef<HTMLAudioElement | null>(null)
    const audioCollectRef = useRef<HTMLAudioElement | null>(null)

    const supabase = createClient()

    useEffect(() => {
        audioPlaceRef.current = new Audio('/audio/card-place-1.ogg')
        audioShuffleRef.current = new Audio('/audio/card-shuffle.ogg')
        audioCollectRef.current = new Audio('/audio/chips-stack-1.ogg') // Recycle chip sound for collecting cards

        if (isTraining) {
            startTrainingGame()
        }
    }, [])

    function playSound(type: 'place' | 'shuffle' | 'collect') {
        try {
            if (type === 'place' && audioPlaceRef.current) {
                audioPlaceRef.current.currentTime = 0
                audioPlaceRef.current.play().catch(() => { })
            } else if (type === 'shuffle' && audioShuffleRef.current) {
                audioShuffleRef.current.currentTime = 0
                audioShuffleRef.current.play().catch(() => { })
            } else if (type === 'collect' && audioCollectRef.current) {
                audioCollectRef.current.currentTime = 0
                audioCollectRef.current.play().catch(() => { })
            }
        } catch (e) {
            console.error(e)
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
        setScores({ A: 0, B: 0 })
        setGameResult(null)
        setLastRoundResult(null)
        setIsTrickProcessing(false)
    }

    // Bot Logic Effect
    useEffect(() => {
        if (!isTraining || !gameState || gameState.status !== 'playing' || isTrickProcessing || gameResult) return

        const currentPlayer = gameState.game_players.find((p: any) => p.position === gameState.current_turn)
        if (currentPlayer && currentPlayer.user_id.startsWith('bot')) {
            const timer = setTimeout(() => {
                makeBotMove(currentPlayer)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [gameState, isTraining, isTrickProcessing, gameResult])

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
        if (isTrickProcessing) return

        playSound('place')
        setGameState((prev: any) => {
            const playerIndex = prev.game_players.findIndex((p: any) => p.user_id === playerId)
            const newHand = prev.game_players[playerIndex].hand.filter((c: string) => c !== card)
            const newTrick = [...prev.current_trick_cards, { player_id: playerId, card }]

            // Check if trick is full
            if (newTrick.length === 4) {
                processTrickEnd(prev, newHand, newTrick, playerIndex)
                // Return state with card played, but keep same turn until processing done?
                // Actually we need to show the card.
                return {
                    ...prev,
                    game_players: prev.game_players.map((p: any, i: number) =>
                        i === playerIndex ? { ...p, hand: newHand } : p
                    ),
                    current_trick_cards: newTrick,
                }
            }

            // Normal move, next player
            return {
                ...prev,
                game_players: prev.game_players.map((p: any, i: number) =>
                    i === playerIndex ? { ...p, hand: newHand } : p
                ),
                current_trick_cards: newTrick,
                current_turn: (prev.current_turn + 1) % 4
            }
        })
    }

    const processTrickEnd = (prevState: any, handAfterMove: string[], fullTrick: any[], playerIndex: number) => {
        setIsTrickProcessing(true)

        // Calculate winner
        const trumpSuit = getCardSuit(prevState.trump_card)
        const winnerId = getTrickWinner(fullTrick, trumpSuit)
        const winnerPlayer = prevState.game_players.find((p: any) => p.user_id === winnerId)
        const points = fullTrick.reduce((acc: number, c: any) => acc + getCardValue(c.card), 0)

        // Update Result State
        setLastRoundResult({
            winner: winnerPlayer.profiles.username,
            points: points,
            team: winnerPlayer.team
        })

        setScores(prev => ({
            ...prev,
            [winnerPlayer.team]: prev[winnerPlayer.team as 'A' | 'B'] + points
        }))

        // Delay then clear
        setTimeout(() => {
            playSound('collect')

            setGameState((state: any) => {
                const newRounds = [...state.rounds, {
                    winner: winnerId,
                    cards: fullTrick,
                    points: points
                }]

                // Check Game End (10 rounds)
                if (newRounds.length === 10) {
                    const finalScoreA = scores.A + (winnerPlayer.team === 'A' ? points : 0) // Add pending points
                    const finalScoreB = scores.B + (winnerPlayer.team === 'B' ? points : 0)
                    // Determine winner (Team with > 60, etc - keeping simple for now)
                    let winnerTeam = 'Draft'
                    if (finalScoreA > finalScoreB) winnerTeam = 'A'
                    else if (finalScoreB > finalScoreA) winnerTeam = 'B'
                    else winnerTeam = 'Draw'

                    setGameResult({
                        winnerTeam,
                        scoreA: finalScoreA,
                        scoreB: finalScoreB
                    })
                    return { ...state, rounds: newRounds, current_trick_cards: [] }
                }

                return {
                    ...state,
                    current_trick_cards: [], // Clear table
                    current_turn: winnerPlayer.position, // Winner leads
                    rounds: newRounds
                }
            })

            setLastRoundResult(null)
            setIsTrickProcessing(false)
        }, 2000)
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
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [game?.id, supabase, isTraining])

    const myPlayer = gameState.game_players.find((p: any) => p.user_id === currentUser.id)
    if (!myPlayer) return <div>Access denied</div>

    const handlePlayCard = async (card: string) => {
        if (loading || isTrickProcessing) return

        if (isTraining) {
            // Validate move
            if (gameState.current_turn !== 0) {
                alert("Não é a sua vez!")
                return
            }
            const myHand = gameState.game_players[0].hand
            const leadCard = gameState.current_trick_cards[0]?.card
            const leadSuit = leadCard ? getCardSuit(leadCard) : null

            if (!isValidMove(card, myHand, leadSuit)) {
                alert("Jogada inválida! Deve assistir ao naipe.")
                return
            }
            handleTrainingMove('human', card)
            return
        }

        // Multiplayer logic
        setLoading(true)
        playSound('place')
        const res = await playCard(game.id, card)
        if (res?.error) alert(res.error)
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
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
            </div>

            {/* Scoreboard */}
            <div className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-xl text-white">
                <div className="flex items-center gap-4 text-sm sm:text-base">
                    <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs uppercase font-bold">Nós (A)</span>
                        <span className="text-xl font-mono font-bold text-green-400">{scores.A}</span>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs uppercase font-bold">Eles (B)</span>
                        <span className="text-xl font-mono font-bold text-red-400">{scores.B}</span>
                    </div>
                </div>
            </div>

            {/* Players */}

            {/* Top Player (Partner) */}
            <div className="absolute top-4 sm:top-8 flex flex-col items-center z-10">
                <div className="h-12 w-12 rounded-full border-2 border-white/50 bg-black/20 overflow-hidden mb-[-10px] z-20 shadow-lg relative">
                    <div className="w-full h-full bg-gray-400 flex items-center justify-center text-xs text-white">Zé</div>
                </div>
                <div className="flex -space-x-8 sm:-space-x-10">
                    {[1, 2, 3].map(i => <div key={i} className="transform scale-75 origin-top">{renderCardBack()}</div>)}
                </div>
            </div>

            {/* Left Player (Opponent) - Moved Inward (left-12) */}
            <div className="absolute left-4 sm:left-[15%] top-1/2 -translate-y-1/2 flex flex-row items-center z-10">
                <div className="flex flex-col -space-y-12 sm:-space-y-14">
                    {[1, 2, 3].map(i => <div key={i} className="transform -rotate-90 scale-75">{renderCardBack()}</div>)}
                </div>
            </div>

            {/* Right Player (Opponent) - Moved Inward (right-12) */}
            <div className="absolute right-4 sm:right-[15%] top-1/2 -translate-y-1/2 flex flex-row items-center z-10">
                <div className="flex flex-col -space-y-12 sm:-space-y-14">
                    {[1, 2, 3].map(i => <div key={i} className="transform rotate-90 scale-75">{renderCardBack()}</div>)}
                </div>
            </div>

            {/* Center (Table) */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                {/* Round Result Overlay */}
                {lastRoundResult && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-in zoom-in fade-in duration-300">
                        <div className="bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl mb-2">
                            <p className="font-bold text-lg">{lastRoundResult.winner} venceu!</p>
                        </div>
                        <div className="text-3xl font-bold text-yellow-400 drop-shadow-md">
                            +{lastRoundResult.points} pts
                        </div>
                    </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center">
                    {gameState.current_trick_cards?.map((c: any, i: number) => {
                        const player = gameState.game_players.find((p: any) => p.user_id === c.player_id)
                        const pos = player?.position
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
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Bottom Player (Me) */}
            <div className="absolute bottom-4 sm:bottom-8 w-full flex flex-col items-center z-20">
                <div className="flex -space-x-8 sm:-space-x-12 mb-6 px-4 py-2 hover:-space-x-6 sm:hover:-space-x-8 transition-all duration-300 ease-out perspective-1000">
                    {myPlayer.hand?.map((card: string, index: number) => {
                        const total = myPlayer.hand.length
                        const mid = (total - 1) / 2
                        const rotate = (index - mid) * 5
                        const translateY = Math.abs(index - mid) * 5
                        return (
                            <div key={card} style={{ transform: `rotate(${rotate}deg) translateY(${translateY}px)`, zIndex: index }}
                                className="transform-gpu transition-transform hover:!rotate-0 hover:!translate-y-[-20px] hover:!z-50">
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
                    {gameState.trump_card && (
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-white/70 uppercase">Trunfo</span>
                            {renderCard(gameState.trump_card, undefined, true)}
                        </div>
                    )}
                </div>
            </div>

            {/* Game Result Overlay */}
            {gameResult && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4 border-4 border-ios-blue/20">
                        <div className="mb-6 flex justify-center">
                            <div className={cn("p-4 rounded-full", gameResult.winnerTeam === 'A' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                <Trophy className="h-12 w-12" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            {gameResult.winnerTeam === 'A' ? 'Vitória!' : 'Derrota!'}
                        </h2>
                        <p className="text-gray-500 mb-6">
                            {gameResult.winnerTeam === 'A' ? 'Parabéns, a sua equipa venceu.' : 'Não foi desta vez.'}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Nós (Team A)</p>
                                <p className="text-2xl font-bold text-gray-900">{gameResult.scoreA}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Eles (Team B)</p>
                                <p className="text-2xl font-bold text-gray-900">{gameResult.scoreB}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors"
                            >
                                <Home className="h-5 w-5" />
                                Sair
                            </button>
                            <button
                                onClick={startTrainingGame}
                                className="flex-1 flex items-center justify-center gap-2 bg-ios-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                <RotateCcw className="h-5 w-5" />
                                Jogar Novamente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
