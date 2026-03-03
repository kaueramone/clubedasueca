'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playCard, cancelGame, leaveGame, playTimeoutCard } from './actions'
import { cn } from '@/lib/utils'
import { getCardAssetPath, generateDeck, shuffleDeck, getTrickWinner, isValidMove, getCardSuit, getCardValue } from './utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trophy, Home, RotateCcw, Clock, User, PlusCircle, ArrowLeft, LogOut } from 'lucide-react'

// Portuguese Colors Constants
const PT_RED = '#CE1126'
const PT_GREEN = '#006600'
const PT_YELLOW = '#FFD700' // Gold-ish

export function GameTable({ game, currentUser, isTraining = false, isDemoGuest = false }: { game?: any, currentUser?: any, isTraining?: boolean, isDemoGuest?: boolean }) {
    const router = useRouter()

    const initialTrainingState = isTraining ? {
        id: 'training',
        status: 'playing',
        stake: 0,
        game_players: [
            { user_id: 'human', position: 0, team: 'A', hand: [], profiles: { username: 'Você', avatar_url: currentUser?.user_metadata?.avatar_url || currentUser?.profiles?.avatar_url || null } },
            { user_id: 'bot1', position: 1, team: 'B', hand: [], profiles: { username: 'Manel (Bot)', avatar_url: '/bots/manel.jpg' } },
            { user_id: 'bot2', position: 2, team: 'A', hand: [], profiles: { username: 'Zé (Bot)', avatar_url: '/bots/ze.jpg' } },
            { user_id: 'bot3', position: 3, team: 'B', hand: [], profiles: { username: 'Quim (Bot)', avatar_url: '/bots/quim.jpg' } },
        ],
        current_trick_cards: [],
        current_turn: 0,
        trump_card: null,
        rounds: [],
    } : game

    const [gameState, setGameState] = useState(initialTrainingState)
    const [loading, setLoading] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [scores, setScores] = useState({ A: 0, B: 0 })
    const [selectedCard, setSelectedCard] = useState<string | null>(null)

    // Detailed Round Recap State
    const [roundRecap, setRoundRecap] = useState<{
        winner: string,
        points: number,
        team: string,
        explanation: string,
        timeLeft: number
    } | null>(null)

    const [gameResult, setGameResult] = useState<{ winnerTeam: string, scoreA: number, scoreB: number } | null>(null)
    const [isTrickProcessing, setIsTrickProcessing] = useState(false)
    const [turnTimeLeft, setTurnTimeLeft] = useState(15)

    // Audio refs
    const audioPlaceRef = useRef<HTMLAudioElement | null>(null)
    const audioShuffleRef = useRef<HTMLAudioElement | null>(null)
    const audioCollectRef = useRef<HTMLAudioElement | null>(null)

    const supabase = createClient()

    useEffect(() => {
        audioPlaceRef.current = new Audio('/audio/card-place-1.ogg')
        audioShuffleRef.current = new Audio('/audio/card-shuffle.ogg')
        audioCollectRef.current = new Audio('/audio/chips-stack-1.ogg')

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
        const trump = deck[deck.length - 1]

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
        setRoundRecap(null)
        setIsTrickProcessing(false)
        setTurnTimeLeft(15)
        setSelectedCard(null)
    }

    // --- AFK Timer Logic ---
    useEffect(() => {
        if (!gameState || gameResult || isTrickProcessing || roundRecap || gameState.status !== 'playing') return

        const myPlayer = isTraining
            ? gameState.game_players[0]
            : gameState.game_players.find((p: any) => p.user_id === currentUser?.id)

        const myTurn = myPlayer && gameState.current_turn === myPlayer.position

        let interval: NodeJS.Timeout

        if (myTurn) {
            setTurnTimeLeft(15) // Reset on turn start
            interval = setInterval(() => {
                setTurnTimeLeft(prev => {
                    if (prev <= 1) {
                        if (isTraining) {
                            autoPlayHuman()
                        } else {
                            autoPlayOnline()
                        }
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else {
            setTurnTimeLeft(15)
        }

        return () => clearInterval(interval)
    }, [gameState.current_turn, gameResult, isTrickProcessing, roundRecap, gameState.status])

    const autoPlayOnline = async () => {
        if (!game || isTraining) return
        setLoading(true)
        const res = await playTimeoutCard(game.id)
        if (res?.error) {
            console.error('[AUTO_PLAY_ERROR]', res.error)
        }
        setLoading(false)
    }

    const autoPlayHuman = () => {
        if (!isTraining) return

        const myHand = gameState.game_players[0].hand
        const leadCard = gameState.current_trick_cards[0]?.card
        const leadSuit = leadCard ? getCardSuit(leadCard) : null

        const validCards = myHand.filter((c: string) => isValidMove(c, myHand, leadSuit))
        const cardToPlay = validCards.length > 0 ? validCards[Math.floor(Math.random() * validCards.length)] : myHand[0]

        if (cardToPlay) {
            setSelectedCard(cardToPlay)
            setTimeout(() => {
                setSelectedCard(null)
                handleTrainingMove('human', cardToPlay)
            }, 300)
        }
    }

    // --- Round Recap Auto-Advance Logic ---
    useEffect(() => {
        if (roundRecap) {
            const interval = setInterval(() => {
                setRoundRecap(prev => {
                    if (!prev) return null
                    if (prev.timeLeft <= 1) {
                        dismissRecap()
                        return null
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 }
                })
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [roundRecap])


    // Bot Logic Effect
    useEffect(() => {
        if (!isTraining || !gameState || gameState.status !== 'playing' || isTrickProcessing || gameResult || roundRecap) return

        const currentPlayer = gameState.game_players.find((p: any) => p.position === gameState.current_turn)
        if (currentPlayer && currentPlayer.user_id.startsWith('bot')) {
            const timer = setTimeout(() => {
                makeBotMove(currentPlayer)
            }, 1000 + Math.random() * 1000)
            return () => clearTimeout(timer)
        }
    }, [gameState, isTraining, isTrickProcessing, gameResult, roundRecap])

    const makeBotMove = (bot: any) => {
        const hand = bot.hand
        const leadCard = gameState.current_trick_cards[0]?.card
        const leadSuit = leadCard ? getCardSuit(leadCard) : null

        const validCards = hand.filter((c: string) => isValidMove(c, hand, leadSuit))
        const cardToPlay = validCards.length > 0 ? validCards[Math.floor(Math.random() * validCards.length)] : hand[0]

        handleTrainingMove(bot.user_id, cardToPlay)
    }

    const handleTrainingMove = (playerId: string, card: string) => {
        if (isTrickProcessing || roundRecap) return

        playSound('place')
        setGameState((prev: any) => {
            const playerIndex = prev.game_players.findIndex((p: any) => p.user_id === playerId)
            const newHand = prev.game_players[playerIndex].hand.filter((c: string) => c !== card)
            const newTrick = [...prev.current_trick_cards, { player_id: playerId, card }]

            if (newTrick.length === 4) {
                processTrickEnd(prev, newHand, newTrick, playerIndex)
                return {
                    ...prev,
                    game_players: prev.game_players.map((p: any, i: number) =>
                        i === playerIndex ? { ...p, hand: newHand } : p
                    ),
                    current_trick_cards: newTrick,
                }
            }

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

        const trumpSuit = getCardSuit(prevState.trump_card)
        const winnerId = getTrickWinner(fullTrick, trumpSuit)
        const winnerPlayer = prevState.game_players.find((p: any) => p.user_id === winnerId) || prevState.game_players[0]
        const points = fullTrick.reduce((acc: number, c: any) => acc + getCardValue(c.card), 0)

        // Generate Explanation
        let explanation = "Carta mais alta vence."
        const winningCard = fullTrick.find((c: any) => c.player_id === winnerId)?.card
        if (winningCard && getCardSuit(winningCard) === trumpSuit) {
            explanation = "Trunfo ganha!"
        }

        setTimeout(() => {
            playSound('collect')

            setScores(prev => ({
                ...prev,
                [winnerPlayer.team]: prev[winnerPlayer.team as 'A' | 'B'] + points
            }))

            setRoundRecap({
                winner: winnerPlayer.profiles.username,
                points: points,
                team: winnerPlayer.team,
                explanation: explanation,
                timeLeft: 10
            })

        }, 1200)
    }

    const dismissRecap = () => {
        if (!roundRecap) return

        setIsTrickProcessing(false)
        setRoundRecap(null)

        setGameState((state: any) => {
            const trick = state.current_trick_cards
            if (trick.length !== 4) return state

            const trumpSuit = getCardSuit(state.trump_card)
            const winnerId = getTrickWinner(trick, trumpSuit)
            const winnerPlayer = state.game_players.find((p: any) => p.user_id === winnerId)
            const points = trick.reduce((acc: number, c: any) => acc + getCardValue(c.card), 0)

            const newRounds = [...state.rounds, {
                winner: winnerId,
                cards: trick,
                points: points
            }]

            if (newRounds.length === 10) {
                const finalScoreA = scores.A
                const finalScoreB = scores.B
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
                current_trick_cards: [],
                current_turn: winnerPlayer.position,
                rounds: newRounds
            }
        })
    }

    // Realtime Subscription
    useEffect(() => {
        if (isTraining) return
        const channel = supabase
            .channel(`game-${game.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game.id}` }, (payload) => {
                setGameState((prev: any) => {
                    const newState = { ...prev, ...payload.new }
                    return newState
                })
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [game?.id, supabase, isTraining])

    // --- Relative Player Positions ---
    const players = gameState?.game_players || []
    const myPlayer = isTraining ? players[0] : players.find((p: any) => p.user_id === currentUser?.id)

    // Safety Fallback (se por alguma razão 'access denied' não triggerar e a vista carregar)
    const myPos = myPlayer?.position ?? 0;

    // offset = 0 (Me), offset = 1 (Left), offset = 2 (Top/Partner), offset = 3 (Right)
    const getRelativePlayer = (offset: number) => {
        const targetPos = (myPos + offset) % 4;
        return players.find((p: any) => p.position === targetPos);
    }

    const pLeft = getRelativePlayer(1);
    const pTop = getRelativePlayer(2);
    const pRight = getRelativePlayer(3);

    if (!myPlayer && gameState.status === 'playing') return <div>Acesso Negado ou não é Jogador desta mesa</div>

    const handlePlayCard = async (card: string) => {
        if (loading || isTrickProcessing || roundRecap) return

        if (selectedCard !== card) {
            setSelectedCard(card)
            return
        }

        setSelectedCard(null)

        if (isTraining) {
            if (gameState.current_turn !== 0) return
            const myHand = myPlayer.hand
            const leadCard = gameState.current_trick_cards[0]?.card
            const leadSuit = leadCard ? getCardSuit(leadCard) : null

            if (!isValidMove(card, myHand, leadSuit)) {
                return
            }
            handleTrainingMove('human', card)
            return
        }

        setLoading(true)
        playSound('place')
        const res = await playCard(game.id, card)
        if (res?.error) alert(res.error)
        setLoading(false)
    }

    const handleCancelGame = async () => {
        if (!confirm('Tem a certeza que deseja cancelar esta mesa? O valor será reembolsado para a sua carteira.')) return
        setCancelling(true)
        const res = await cancelGame(game.id)
        if (res?.error) {
            alert(res.error)
            setCancelling(false)
        }
    }

    // --- New Color Logic for Avatars in Portuguese Theme ---
    const getAvatarBorderColor = (p: any) => {
        if (!p) return 'border-transparent' // Defensive check
        // Team A = Green (Portugal Green), Team B = Red (Portugal Red)
        if (p.team === 'A') return 'border-[#006600]'
        return 'border-[#CE1126]'
    }

    const renderCard = (card: string, onClick?: () => void, isOpponent = false) => {
        const src = getCardAssetPath(card)
        return (
            <div
                onClick={onClick}
                className={cn(
                    "relative transition-all select-none filter drop-shadow-md",
                    onClick ? "cursor-pointer active:scale-95 z-0" : "",
                    isOpponent ? "w-14 h-20 sm:w-20 sm:h-28" : "w-[5.2rem] h-[7.8rem] sm:w-[6.5rem] sm:h-[9.75rem] lg:w-32 lg:h-48"
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
                "relative filter drop-shadow-sm",
                "w-14 h-20 sm:w-20 sm:h-28",
                rotate ? "rotate-90" : ""
            )}>
                <Image
                    src="/cards/card_back.png"
                    alt="Back"
                    fill
                    className="object-cover rounded-md"
                />
            </div>
        )
    }

    // Helper for compact Trump display
    const getSuitIcon = (suit: string) => {
        if (!suit) return null;
        switch (suit) {
            case 'H': return <span className="text-red-500 text-xl leading-none">♥</span>
            case 'D': return <span className="text-red-500 text-xl leading-none">♦</span>
            case 'C': return <span className="text-gray-900 text-xl leading-none">♣</span>
            case 'S': return <span className="text-gray-900 text-xl leading-none">♠</span>
            default: return null
        }
    }

    // Helper to generate precise number of cards for opponents
    const getOpponentCards = (player: any) => {
        const count = player?.hand?.length || 0;
        return Array(count).fill(0).map((_, i) => i);
    }

    return (
        <div className="relative h-full w-full bg-[#35654d] overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 select-none">
            {/* Background Images */}
            <div className="absolute inset-0 z-0">
                <Image src="/images/mesa-horizontal.png" alt="Table" fill className="object-cover hidden md:block" priority />
                <Image src="/images/mesa-vert.png" alt="Table" fill className="object-cover md:hidden" priority />
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
            </div>

            {/* Exit/Back Button (Training or Demo) */}
            {(isTraining || isDemoGuest) && (
                <div className="absolute top-4 left-4 z-40">
                    <button
                        onClick={() => router.push(isDemoGuest ? '/' : '/dashboard')}
                        className="bg-black/40 hover:bg-black/60 text-white p-2 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full sm:rounded-xl backdrop-blur-md border border-white/10 shadow-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline font-bold text-sm">Sair</span>
                    </button>
                </div>
            )}

            {/* Exit/Back Button (Real Game waiting) */}
            {!isTraining && !isDemoGuest && gameState.status === 'waiting' && myPlayer && (
                <div className="absolute top-4 left-4 z-40">
                    <button
                        onClick={async () => {
                            if (!confirm('Deseja sair da mesa? O seu saldo será reembolsado.')) return;
                            const res = await leaveGame(game.id);
                            if (res?.error) {
                                alert(res.error);
                            } else {
                                router.push('/dashboard/play');
                            }
                        }}
                        className="bg-black/40 hover:bg-black/60 text-white p-2 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full sm:rounded-xl backdrop-blur-md border border-white/10 shadow-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-red-400" />
                        <span className="hidden sm:inline font-bold text-sm text-red-400">Abandonar Mesa</span>
                    </button>
                </div>
            )}

            {/* Owner Table Controls */}
            {gameState.status === 'waiting' && currentUser?.id === game?.host_id && !isTraining && (
                <div className="absolute top-4 left-4 z-30">
                    <button
                        onClick={handleCancelGame}
                        disabled={cancelling}
                        className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-md shadow-lg transition-colors border border-red-400"
                    >
                        {cancelling ? <Clock className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Cancelar Mesa
                    </button>
                </div>
            )}

            {/* Scoreboard - Updated Colors */}
            <div className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-xl text-white">
                <div className="flex items-center gap-4 text-sm sm:text-base">
                    <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs uppercase font-bold">Nós (A)</span>
                        <span className="text-xl font-mono font-bold text-[#4ade80]">{scores.A}</span>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs uppercase font-bold">Eles (B)</span>
                        <span className="text-xl font-mono font-bold text-[#f87171]">{scores.B}</span>
                    </div>
                </div>
            </div>

            {/* AFK Timer */}
            {gameState.current_turn === 0 && !roundRecap && !gameResult && (
                <div className="absolute top-20 right-4 z-30 flex items-center gap-2 bg-yellow-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-500/50">
                    <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-yellow-400 font-mono font-bold">{turnTimeLeft}s</span>
                </div>
            )}

            {/* --- Players --- */}

            {/* Top Player (Partner) */}
            <div className="absolute top-[8%] sm:top-8 flex flex-col items-center z-10 w-full">
                <div className="flex flex-col items-center mb-[-10px] z-20">
                    <span className="text-[10px] sm:text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full mb-1">{pTop?.profiles?.username?.split(' ')[0] || 'Aguardar'}</span>
                    <div className={`h-12 w-12 rounded-full border-2 ${getAvatarBorderColor(pTop)} bg-black/20 overflow-hidden shadow-lg relative`}>
                        {pTop?.profiles?.avatar_url ? (
                            <Image src={pTop.profiles.avatar_url} alt="P" fill className="object-cover" />
                        ) : pTop?.profiles?.username ? (
                            <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-white text-lg">{pTop.profiles.username.charAt(0).toUpperCase()}</div>
                        ) : gameState.status === 'waiting' ? (
                            <button onClick={() => alert('Em breve: Partilhar Link!')} className="w-full h-full bg-accent flex items-center justify-center text-white hover:bg-accent/80 transition-colors"><PlusCircle className="w-5 h-5" /></button>
                        ) : (
                            <div className="w-full h-full bg-gray-400 flex items-center justify-center text-xs text-white">Bot</div>
                        )}
                    </div>
                </div>
                {/* Fixed Hand Count */}
                <div className="flex -space-x-[50px] sm:-space-x-[70px] h-20 items-start">
                    {getOpponentCards(pTop).map(i => (
                        <div key={i} className="transform scale-75 origin-top">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Left Player (Opponent) - CORRECTED LAYOUT: Avatar on Left (Edge), Cards on Right (Center) */}
            <div className="absolute left-6 sm:left-[10%] top-1/2 -translate-y-1/2 flex flex-row items-center z-10 gap-2 sm:gap-4">
                <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-full border-2 ${getAvatarBorderColor(pLeft)} bg-gray-400 overflow-hidden z-20 shadow-lg relative`}>
                        {pLeft?.profiles?.avatar_url ? (
                            <Image src={pLeft.profiles.avatar_url} alt="P" fill className="object-cover" />
                        ) : pLeft?.profiles?.username ? (
                            <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-white text-lg">{pLeft.profiles.username.charAt(0).toUpperCase()}</div>
                        ) : gameState.status === 'waiting' ? (
                            <button onClick={() => alert('Em breve: Partilhar Link!')} className="w-full h-full bg-accent flex items-center justify-center text-white hover:bg-accent/80 transition-colors"><PlusCircle className="w-5 h-5" /></button>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white">Bot</div>
                        )}
                    </div>
                    <div className="flex flex-col items-center mt-1">
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full line-clamp-1 max-w-[60px] text-center">{pLeft?.profiles?.username?.split(' ')[0] || 'Aguardar'}</span>
                    </div>
                </div>
                {/* Lateral stacking deck effect */}
                <div className="flex flex-col -space-y-[100px] sm:-space-y-[120px] ml-2">
                    {getOpponentCards(pLeft).map(i => (
                        <div key={i} className="transform -rotate-90 scale-75 shadow-sm">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Right Player (Opponent) - CORRECTED LAYOUT: Cards on Left (Center), Avatar on Right (Edge) */}
            <div className="absolute right-6 sm:right-[10%] top-1/2 -translate-y-1/2 flex flex-row items-center z-10 gap-2 sm:gap-4">
                <div className="flex flex-col -space-y-[100px] sm:-space-y-[120px] mr-2">
                    {getOpponentCards(pRight).map(i => (
                        <div key={i} className="transform rotate-90 scale-75 shadow-sm">{renderCardBack()}</div>
                    ))}
                </div>
                <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-full border-2 ${getAvatarBorderColor(pRight)} bg-gray-400 overflow-hidden z-20 shadow-lg relative`}>
                        {pRight?.profiles?.avatar_url ? (
                            <Image src={pRight.profiles.avatar_url} alt="P" fill className="object-cover" />
                        ) : pRight?.profiles?.username ? (
                            <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-white text-lg">{pRight.profiles.username.charAt(0).toUpperCase()}</div>
                        ) : gameState.status === 'waiting' ? (
                            <button onClick={() => alert('Em breve: Partilhar Link!')} className="w-full h-full bg-accent flex items-center justify-center text-white hover:bg-accent/80 transition-colors"><PlusCircle className="w-5 h-5" /></button>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white">Bot</div>
                        )}
                    </div>
                    <div className="flex flex-col items-center mt-1">
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full line-clamp-1 max-w-[60px] text-center">{pRight?.profiles?.username?.split(' ')[0] || 'Aguardar'}</span>
                    </div>
                </div>
            </div>

            {/* Center (Table) */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-10 flex items-center justify-center pointer-events-none p-8">
                    <Image src="/images/favicon.png" alt="Watermark" fill className="object-contain p-4" />
                </div>

                {/* Waiting State Overlay */}
                {gameState.status === 'waiting' && !isTraining && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-center p-4">
                        <User className="w-8 h-8 text-white/50 mb-2" />
                        <h3 className="text-white font-bold text-sm sm:text-base">Aguardando Jogadores</h3>
                        <p className="text-white/70 text-xs mt-1">
                            {gameState.game_players?.length || 1}/4 na mesa
                        </p>
                        <button onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert('Link da mesa copiado!');
                        }} className="mt-4 bg-accent text-accent-foreground px-4 py-2 rounded-full text-xs font-bold hover:bg-accent/90 transition-colors shadow-lg flex items-center gap-2">
                            <PlusCircle className="w-4 h-4" /> Convidar
                        </button>
                    </div>
                )}

                {roundRecap && (
                    <div
                        onClick={dismissRecap}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 rounded-full cursor-pointer hover:bg-black/70 transition-colors animate-in fade-in"
                    >
                        <div className="text-center space-y-1 p-4">
                            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">{roundRecap.explanation}</p>
                            <div className="flex flex-col items-center">
                                <p className="text-xl font-bold text-white shadow-black drop-shadow-md">{roundRecap.winner}</p>
                                <p className="text-2xl font-black text-[#FFD700]">+{roundRecap.points}</p>
                            </div>
                            <p className="text-[10px] text-white/50 mt-2">Próxima em {roundRecap.timeLeft}s...</p>
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
            <div className="absolute bottom-6 sm:bottom-10 w-full flex flex-col items-center z-20">
                <div className="flex -space-x-[2.8rem] sm:-space-x-[3.5rem] mb-6 sm:mb-8 px-2 py-2 hover:-space-x-[2rem] transition-all duration-300 ease-out perspective-1000 max-w-[95vw] overflow-visible justify-center">
                    {myPlayer.hand?.map((card: string, index: number) => {
                        const total = myPlayer.hand.length
                        const mid = (total - 1) / 2
                        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
                        const rotate = (index - mid) * (isMobile ? 3 : 5)
                        const isSelected = selectedCard === card
                        const pullUp = isSelected ? (isMobile ? 35 : 45) : 0
                        const translateY = Math.abs(index - mid) * (isMobile ? 2 : 5) - pullUp

                        return (
                            <div key={card} style={{ transform: `rotate(${rotate}deg) translateY(${translateY}px)`, zIndex: isSelected ? 50 : index }}
                                className={cn("transform-gpu transition-transform origin-bottom", !isSelected && "hover:!rotate-0 hover:!translate-y-[-10px] hover:!z-40")}>
                                {renderCard(card, () => handlePlayCard(card))}
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center gap-3 bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-xl">
                    <div className="h-10 w-10 rounded-full bg-gray-200 border-2 border-white overflow-hidden relative">
                        {myPlayer.profiles?.avatar_url ? (
                            <Image src={myPlayer.profiles.avatar_url} alt="Me" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-6 h-6" /></div>
                        )}
                    </div>
                    <span className="text-white font-bold text-shadow-sm">{myPlayer.profiles?.username || 'Eu'}</span>
                    <div className="h-full w-px bg-white/20 mx-2" />
                    {gameState.trump_card && (
                        <div className="flex items-center gap-1.5 bg-white border-2 border-accent px-3 py-1 rounded-md shadow-inner">
                            <span className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">Trunfo</span>
                            {getSuitIcon(getCardSuit(gameState.trump_card))}
                        </div>
                    )}
                </div>
            </div>

            {/* Game Result Overlay */}
            {gameResult && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4 border-4 border-accent/20">
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

                        {!isTraining && gameState.stake > 0 && (
                            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xl text-center shadow-sm">
                                <p className="text-sm font-bold text-gray-800">Pote da Equipa Vencedora: <span className="text-green-600">€{(gameState.stake * 4 * 0.8).toFixed(2)}</span></p>
                                <p className="text-xs text-gray-500 mt-1">Taxa de Mesa (Rake do Clube): 20%</p>
                            </div>
                        )}

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

                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push(isDemoGuest ? '/' : '/dashboard')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors"
                                >
                                    <Home className="h-5 w-5" />
                                    Sair
                                </button>
                                <button
                                    onClick={startTrainingGame}
                                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors"
                                >
                                    <RotateCcw className="h-5 w-5" />
                                    Nova Partida
                                </button>
                            </div>

                            {isDemoGuest && (
                                <button
                                    onClick={() => router.push('/register')}
                                    className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 rounded-xl transition-colors shadow-premium animate-pulse"
                                >
                                    <Trophy className="h-5 w-5" />
                                    Gostou? Crie a sua Conta e Jogue a Dinheiro!
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
