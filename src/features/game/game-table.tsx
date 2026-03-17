'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playCard, cancelGame, leaveGame, playTimeoutCard, getFriendsForInvite, sendTableInvite } from './actions'
import { cn } from '@/lib/utils'
import { getCardAssetPath, generateDeck, shuffleDeck, getTrickWinner, isValidMove, getCardSuit, getCardValue, sortHand } from './utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Clock, User, ArrowLeft, LogOut, RotateCcw, UserPlus, X, Check } from 'lucide-react'

import { PlayerAvatar } from './components/player-avatar'
import { ScoreBoard } from './components/score-board'
import { GameChat, GameChatToggle } from './components/game-chat'
import { GameResultOverlay } from './components/game-result-overlay'
import { TrumpAnimation } from './components/trump-animation'

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

    // Chat State
    const [messages, setMessages] = useState<{ sender: string, text: string, time: string, isBot?: boolean }[]>([])
    const [showChat, setShowChat] = useState(false)
    const [newMessage, setNewMessage] = useState('')
    const [unreadCount, setUnreadCount] = useState(0)

    // Invite Modal State
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteFriends, setInviteFriends] = useState<{ id: string, username: string, avatar_url: string | null }[]>([])
    const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({})
    const [inviteTeam, setInviteTeam] = useState<'A' | 'B' | null>(null)
    const [shareCopied, setShareCopied] = useState(false)

    const [gameCancelled, setGameCancelled] = useState(false)

    // Trump Card Intro Animation State
    const [showTrumpAnimation, setShowTrumpAnimation] = useState(false)
    const [isFadingOutTrump, setIsFadingOutTrump] = useState(false)
    const hasShownTrumpRef = useRef(false)

    // Audio refs
    const audioPlaceRef = useRef<HTMLAudioElement | null>(null)
    const audioShuffleRef = useRef<HTMLAudioElement | null>(null)
    const audioCollectRef = useRef<HTMLAudioElement | null>(null)

    const supabase = createClient()

    const openSeatInvite = async (seatAbsPos: number) => {
        const team: 'A' | 'B' = seatAbsPos % 2 === 0 ? 'A' : 'B'
        setInviteTeam(team)
        setInviteSent({})
        const friends = await getFriendsForInvite()
        setInviteFriends(friends)
        setShowInviteModal(true)
    }

    const handleSendInvite = async (friendId: string) => {
        const gameId = gameState?.id
        if (!gameId) return
        await sendTableInvite(gameId, friendId, inviteTeam || undefined)
        setInviteSent(prev => ({ ...prev, [friendId]: true }))
    }

    const handleShareLink = () => {
        const url = `${window.location.origin}/dashboard/play/${game?.id}`
        const text = `Vem jogar Sueca comigo no Clube da Sueca! 🃏 Entra na minha mesa: ${url}`
        navigator.clipboard.writeText(text).then(() => {
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 2500)
        })
    }

    // --- Sync real user profile into training game state ---
    useEffect(() => {
        if (!isTraining) return
        const realUsername = currentUser?.profiles?.username
        const realAvatar = currentUser?.profiles?.avatar_url || currentUser?.user_metadata?.avatar_url
        if (!realUsername || realUsername === 'Você') return

        setGameState((prev: any) => {
            if (!prev?.game_players) return prev
            const human = prev.game_players[0]
            if (human?.profiles?.username === realUsername) return prev // already synced
            return {
                ...prev,
                game_players: prev.game_players.map((p: any, i: number) =>
                    i === 0 ? { ...p, profiles: { ...p.profiles, username: realUsername, avatar_url: realAvatar || null } } : p
                )
            }
        })
    }, [isTraining, currentUser?.profiles?.username, currentUser?.profiles?.avatar_url, currentUser?.user_metadata?.avatar_url])

    // --- Training/Demo State Persistence ---
    useEffect(() => {
        if (!isTraining && !isDemoGuest) return;
        const savedState = localStorage.getItem('sueca_training_state');
        const savedScores = localStorage.getItem('sueca_training_scores');

        if (savedState && savedScores) {
            try {
                setGameState(JSON.parse(savedState));
                setScores(JSON.parse(savedScores));
            } catch (e) {
                console.error("Failed to parse saved game state:", e);
                startTrainingGame();
            }
        } else {
            startTrainingGame();
        }
    }, [isTraining, isDemoGuest]);

    // Save state on change
    useEffect(() => {
        if ((isTraining || isDemoGuest) && gameState && gameState.status === 'playing') {
            localStorage.setItem('sueca_training_state', JSON.stringify(gameState));
            localStorage.setItem('sueca_training_scores', JSON.stringify(scores));
        }
    }, [gameState, scores, isTraining, isDemoGuest]);

    useEffect(() => {
        audioPlaceRef.current = new Audio('/audio/card-place-1.ogg')
        audioShuffleRef.current = new Audio('/audio/card-shuffle.ogg')
        audioCollectRef.current = new Audio('/audio/chips-stack-1.ogg')
    }, [])

    const playSound = useCallback((type: 'place' | 'shuffle' | 'collect') => {
        try {
            const ref = type === 'place' ? audioPlaceRef : type === 'shuffle' ? audioShuffleRef : audioCollectRef
            if (ref.current) {
                ref.current.currentTime = 0
                ref.current.play().catch(() => { })
            }
        } catch (e) {
            console.error(e)
        }
    }, [])

    const startTrainingGame = useCallback(() => {
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
        hasShownTrumpRef.current = false
        setShowTrumpAnimation(false)
    }, [playSound])

    // --- Trump Card Intro Animation Logic ---
    useEffect(() => {
        if (gameState?.status === 'playing' && gameState?.trump_card && gameState.rounds?.length === 0 && gameState.current_trick_cards?.length === 0 && !hasShownTrumpRef.current) {
            const isFreshStart = gameState.game_players.every((p: any) => p.hand.length === 10);

            if (isFreshStart) {
                hasShownTrumpRef.current = true
                setShowTrumpAnimation(true)
                setIsFadingOutTrump(false)

                const fadeTimer = setTimeout(() => {
                    setIsFadingOutTrump(true)
                }, 2000)

                const removeTimer = setTimeout(() => {
                    setShowTrumpAnimation(false)
                    setIsFadingOutTrump(false)
                }, 3000)

                return () => {
                    clearTimeout(fadeTimer)
                    clearTimeout(removeTimer)
                }
            } else {
                hasShownTrumpRef.current = true
            }
        }
    }, [gameState?.status, gameState?.trump_card, gameState?.rounds, gameState?.current_trick_cards])

    // --- AFK Timer Logic ---
    useEffect(() => {
        if (!gameState || gameResult || isTrickProcessing || roundRecap || gameState.status !== 'playing') return

        const myPlayer = isTraining
            ? gameState.game_players[0]
            : gameState.game_players.find((p: any) => p.user_id === currentUser?.id)

        const myTurn = myPlayer && gameState.current_turn === myPlayer.position

        let interval: NodeJS.Timeout

        if (myTurn) {
            setTurnTimeLeft(15)
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

    const autoPlayOnline = useCallback(async () => {
        if (!game || isTraining) return
        setLoading(true)
        const res = await playTimeoutCard(game.id)
        if (res?.error) {
            console.error('[AUTO_PLAY_ERROR]', res.error)
        }
        setLoading(false)
    }, [game, isTraining])

    const autoPlayHuman = useCallback(() => {
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
    }, [isTraining, gameState])

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

    const makeBotMove = useCallback((bot: any) => {
        const hand = bot.hand
        const leadCard = gameState.current_trick_cards[0]?.card
        const leadSuit = leadCard ? getCardSuit(leadCard) : null

        const validCards = hand.filter((c: string) => isValidMove(c, hand, leadSuit))
        const cardToPlay = validCards.length > 0 ? validCards[Math.floor(Math.random() * validCards.length)] : hand[0]

        handleTrainingMove(bot.user_id, cardToPlay)
    }, [gameState])

    // --- Bot Chat Simulator Logic ---
    useEffect(() => {
        if (!isTraining || !gameState || gameState.status !== 'playing' || gameResult) return

        const botPhrases = [
            "Bota trunfo nisso!", "Assiste parceiro!", "Quem não tem, chora!",
            "Essa vaza já é nossa.", "Estás a dormir?", "Bem jogado!",
            "Toma lá disto!", "Não cortas essa...", "É para a mesa ou para a gaveta?"
        ]

        const botNames = ["Manel (Bot)", "Zé (Bot)", "Quim (Bot)"]

        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const randomBot = botNames[Math.floor(Math.random() * botNames.length)]
                const randomPhrase = botPhrases[Math.floor(Math.random() * botPhrases.length)]

                const newMsg = {
                    sender: randomBot,
                    text: randomPhrase,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isBot: true
                }

                setMessages(prev => [...prev, newMsg])
                if (!showChat) setUnreadCount(prev => prev + 1)
            }
        }, 12000 + Math.random() * 8000)

        return () => clearInterval(interval)
    }, [isTraining, gameState?.status, gameResult, showChat])

    useEffect(() => {
        if (showChat) {
            setUnreadCount(0)
        }
    }, [showChat])

    const handleTrainingMove = useCallback((playerId: string, card: string) => {
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
    }, [isTrickProcessing, roundRecap, playSound])

    const buildTrickExplanation = useCallback((fullTrick: any[], winnerId: string, trumpSuit: string) => {
        const SUIT_NAMES: Record<string, string> = { hearts: 'Copas', diamonds: 'Ouros', clubs: 'Paus', spades: 'Espadas' }
        const RANK_NAMES: Record<string, string> = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', 'Q': 'Dama', 'J': 'Valete', 'K': 'Rei', '7': '7', 'A': 'Ás' }

        const winnerEntry = fullTrick.find((c: any) => c.player_id === winnerId)
        if (!winnerEntry) return "Carta mais alta vence."

        const winnerCard = winnerEntry.card
        const winnerSuit = getCardSuit(winnerCard)
        const winnerRank = winnerCard.split('-')[1]
        const leadCard = fullTrick[0].card
        const leadSuit = getCardSuit(leadCard)
        const trumpsPlayed = fullTrick.filter((c: any) => getCardSuit(c.card) === trumpSuit)
        const leadSuitCards = fullTrick.filter((c: any) => getCardSuit(c.card) === leadSuit)

        if (winnerSuit === trumpSuit) {
            if (trumpsPlayed.length === 1) {
                // Only one trump played — it beats everything
                return `${RANK_NAMES[winnerRank] || winnerRank} de ${SUIT_NAMES[winnerSuit] || winnerSuit} foi o único trunfo jogado.`
            } else {
                // Multiple trumps — highest wins
                return `${RANK_NAMES[winnerRank] || winnerRank} de ${SUIT_NAMES[winnerSuit] || winnerSuit} foi o trunfo mais alto da vaza.`
            }
        } else if (winnerSuit === leadSuit) {
            if (leadSuitCards.length === fullTrick.length) {
                // No trump, all lead suit — highest lead suit card wins
                return `${RANK_NAMES[winnerRank] || winnerRank} de ${SUIT_NAMES[winnerSuit] || winnerSuit} foi a carta mais alta do naipe de saída.`
            } else {
                // Some didn't follow suit (they played other non-trump suits) — highest lead suit wins
                return `${RANK_NAMES[winnerRank] || winnerRank} de ${SUIT_NAMES[winnerSuit] || winnerSuit} foi a mais alta do naipe de saída (${SUIT_NAMES[leadSuit] || leadSuit}).`
            }
        }

        return "Carta mais alta vence."
    }, [])

    const processTrickEnd = useCallback((prevState: any, handAfterMove: string[], fullTrick: any[], playerIndex: number) => {
        setIsTrickProcessing(true)

        const trumpSuit = getCardSuit(prevState.trump_card)
        const winnerId = getTrickWinner(fullTrick, trumpSuit)
        const winnerPlayer = prevState.game_players.find((p: any) => p.user_id === winnerId) || prevState.game_players[0]
        const points = fullTrick.reduce((acc: number, c: any) => acc + getCardValue(c.card), 0)

        const explanation = buildTrickExplanation(fullTrick, winnerId, trumpSuit)

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
    }, [playSound, buildTrickExplanation])

    const dismissRecap = useCallback(() => {
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
    }, [roundRecap, scores])

    // Realtime Subscription & Chat Channel
    const [realtimeChannel, setRealtimeChannel] = useState<any>(null)

    useEffect(() => {
        if (isTraining) return
        const channel = supabase
            .channel(`game-${game.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game.id}` }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    setGameCancelled(true)
                    return
                }
                setGameState((prev: any) => ({ ...prev, ...payload.new }))
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${game.id}` }, async () => {
                const { data: players } = await supabase
                    .from('game_players')
                    .select('*, profiles(username, avatar_url)')
                    .eq('game_id', game.id)
                if (players) {
                    setGameState((prev: any) => ({ ...prev, game_players: players }))
                }
            })
            .on('broadcast', { event: 'chat_message' }, (payload) => {
                setMessages(prev => [...prev, payload.payload])
                if (!showChat) setUnreadCount(prev => prev + 1)
            })
            .subscribe()

        setRealtimeChannel(channel)
        return () => { supabase.removeChannel(channel) }
    }, [game?.id, supabase, isTraining, showChat])

    const handleSendMessage = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const msg = {
            sender: isTraining ? (gameState?.game_players?.[0]?.profiles?.username || 'Você') : (currentUser?.profiles?.username || 'Você'),
            text: newMessage.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        if (isTraining) {
            setMessages(prev => [...prev, msg])
        } else if (realtimeChannel) {
            setMessages(prev => [...prev, msg])
            realtimeChannel.send({
                type: 'broadcast',
                event: 'chat_message',
                payload: msg
            })
        }

        setNewMessage('')
    }, [newMessage, currentUser, isTraining, realtimeChannel])

    // --- Relative Player Positions ---
    const players = gameState?.game_players || []
    const myPlayer = isTraining ? players[0] : players.find((p: any) => p.user_id === currentUser?.id)
    const myPos = myPlayer?.position ?? 0;
    const isHost = !isTraining && game?.host_id === currentUser?.id && gameState.status === 'waiting'

    const { pLeft, pTop, pRight } = useMemo(() => {
        const getRelativePlayer = (offset: number) => {
            const targetPos = (myPos + offset) % 4;
            return players.find((p: any) => p.position === targetPos);
        }
        return {
            pLeft: getRelativePlayer(1),
            pTop: getRelativePlayer(2),
            pRight: getRelativePlayer(3),
        }
    }, [players, myPos])

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

    const getAvatarBorderColor = (p: any) => {
        if (!p) return 'border-transparent'
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
                    alt="Carta virada"
                    fill
                    className="object-cover rounded-md"
                />
            </div>
        )
    }

    const getOpponentCards = (player: any) => {
        const count = player?.hand?.length || 0;
        return Array(count).fill(0).map((_, i) => i);
    }

    const currentUsername = isTraining
        ? (gameState?.game_players?.[0]?.profiles?.username || 'Você')
        : (currentUser?.profiles?.username || 'Você')

    return (
        <div className="relative h-full w-full bg-[#35654d] overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 select-none">
            {/* Background Images */}
            <div className="absolute inset-0 z-0">
                <Image src="/images/mesa-horizontal.png" alt="Mesa de jogo" fill className="object-cover hidden md:block" priority />
                <Image src="/images/mesa-vert.png" alt="Mesa de jogo" fill className="object-cover md:hidden" priority />
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
            </div>

            {/* Left Controls Container (Exit + Chat) */}
            <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                {/* Exit/Back Button (Training or Demo) */}
                {(isTraining || isDemoGuest) && (
                    <button
                        onClick={() => {
                            if (confirm('Deseja cancelar esta partida de treino? O progresso será perdido.')) {
                                localStorage.removeItem('sueca_training_state');
                                localStorage.removeItem('sueca_training_scores');
                                router.push(isDemoGuest ? '/' : '/dashboard');
                            }
                        }}
                        className="bg-black/40 hover:bg-black/60 text-white p-2 sm:px-4 sm:py-2 flex items-center gap-2 rounded-full sm:rounded-xl backdrop-blur-md border border-white/10 shadow-xl transition-colors"
                        aria-label="Sair da partida"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline font-bold text-sm">Sair</span>
                    </button>
                )}

                {/* Exit/Back Button (Real Game waiting) */}
                {!isTraining && !isDemoGuest && gameState.status === 'waiting' && myPlayer && (
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
                        aria-label="Abandonar mesa"
                    >
                        <LogOut className="w-5 h-5 text-red-400" />
                        <span className="hidden sm:inline font-bold text-sm text-red-400">Abandonar Mesa</span>
                    </button>
                )}

                {/* Owner Cancel Controls */}
                {gameState.status === 'waiting' && currentUser?.id === game?.host_id && !isTraining && (
                    <button
                        onClick={handleCancelGame}
                        disabled={cancelling}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 sm:px-4 sm:py-2 rounded-full sm:rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-md shadow-lg transition-colors border border-red-400"
                        aria-label="Cancelar mesa"
                    >
                        {cancelling ? <Clock className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />}
                        <span className="hidden sm:inline">Cancelar Mesa</span>
                    </button>
                )}

                {/* Chat Toggle Button */}
                <GameChatToggle
                    onClick={() => setShowChat(true)}
                    unreadCount={unreadCount}
                />
            </div>

            {/* Chat Panels (positioned relative to game container, outside controls div) */}
            <GameChat
                showChat={showChat}
                setShowChat={setShowChat}
                messages={messages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={handleSendMessage}
                currentUsername={currentUsername}
            />

            {/* Scoreboard */}
            <ScoreBoard scoreA={scores.A} scoreB={scores.B} />

            {/* AFK Timer */}
            {gameState.current_turn === myPos && !roundRecap && !gameResult && gameState.status === 'playing' && (
                <div className="absolute top-20 right-4 z-30 flex items-center gap-2 bg-yellow-900/40 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-500/50" role="timer" aria-label={`Tempo restante: ${turnTimeLeft} segundos`}>
                    <Clock className="w-4 h-4 text-yellow-300 animate-pulse" />
                    <span className="text-yellow-300 font-mono font-bold">{turnTimeLeft}s</span>
                </div>
            )}

            {/* --- Players --- */}

            {/* Top Player (Partner) */}
            <div className="absolute top-[8%] sm:top-8 flex flex-col items-center z-10 w-full">
                <div className="flex flex-col items-center mb-[-10px] z-20">
                    <span className="text-[10px] sm:text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full mb-1">{pTop?.profiles?.username?.split(' ')[0] || 'Aguardar'}</span>
                    <PlayerAvatar player={pTop} gameStatus={gameState.status} borderColorClass={getAvatarBorderColor(pTop)} onInvite={isHost && !pTop ? () => openSeatInvite((myPos + 2) % 4) : undefined} />
                </div>
                <div className="flex -space-x-[50px] sm:-space-x-[70px] h-20 items-start">
                    {getOpponentCards(pTop).map(i => (
                        <div key={i} className="transform scale-75 origin-top">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Left Player (Opponent) */}
            <div className="absolute left-6 sm:left-[10%] top-1/2 -translate-y-1/2 flex flex-row items-center z-10 gap-2 sm:gap-4">
                <div className="flex flex-col items-center shrink-0">
                    <PlayerAvatar player={pLeft} gameStatus={gameState.status} borderColorClass={getAvatarBorderColor(pLeft)} onInvite={isHost && !pLeft ? () => openSeatInvite((myPos + 1) % 4) : undefined} />
                    <div className="flex flex-col items-center mt-1">
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full line-clamp-1 max-w-[60px] text-center">{pLeft?.profiles?.username?.split(' ')[0] || 'Aguardar'}</span>
                    </div>
                </div>
                <div className="flex flex-col -space-y-[100px] sm:-space-y-[120px] ml-2">
                    {getOpponentCards(pLeft).map(i => (
                        <div key={i} className="transform -rotate-90 scale-75 shadow-sm">{renderCardBack()}</div>
                    ))}
                </div>
            </div>

            {/* Right Player (Opponent) */}
            <div className="absolute right-6 sm:right-[10%] top-1/2 -translate-y-1/2 flex flex-row items-center z-10 gap-2 sm:gap-4">
                <div className="flex flex-col -space-y-[100px] sm:-space-y-[120px] mr-2">
                    {getOpponentCards(pRight).map(i => (
                        <div key={i} className="transform rotate-90 scale-75 shadow-sm">{renderCardBack()}</div>
                    ))}
                </div>
                <div className="flex flex-col items-center shrink-0">
                    <PlayerAvatar player={pRight} gameStatus={gameState.status} borderColorClass={getAvatarBorderColor(pRight)} onInvite={isHost && !pRight ? () => openSeatInvite((myPos + 3) % 4) : undefined} />
                    <div className="flex flex-col items-center mt-1">
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full line-clamp-1 max-w-[60px] text-center">{pRight?.profiles?.username?.split(' ')[0] || 'Aguardar'}</span>
                    </div>
                </div>
            </div>

            {/* Center (Table) */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-10 flex items-center justify-center pointer-events-none p-8">
                    <Image src="/images/favicon.png" alt="" fill className="object-contain p-4" aria-hidden="true" />
                </div>

                {/* Waiting State Overlay */}
                {gameState.status === 'waiting' && !isTraining && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-center p-4">
                        <User className="w-8 h-8 text-white/50 mb-2" />
                        <h3 className="text-white font-bold text-sm sm:text-base">Aguardando Jogadores</h3>
                        <p className="text-white/70 text-xs mt-1 mb-3">
                            {gameState.game_players?.length || 1}/4 na mesa
                        </p>
                        <button
                            onClick={handleShareLink}
                            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors shadow flex items-center gap-1.5 border border-white/20"
                        >
                            {shareCopied ? <><Check className="w-3.5 h-3.5 text-green-300" /> Link copiado!</> : <>🔗 Partilhar Mesa</>}
                        </button>
                        {!shareCopied && <p className="text-white/40 text-[10px] mt-1.5">Partilha com amigos externos</p>}
                    </div>
                )}

                {roundRecap && (
                    <div
                        onClick={dismissRecap}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 rounded-full cursor-pointer hover:bg-black/70 transition-colors animate-in fade-in"
                        role="status"
                        aria-label={`${roundRecap.winner} ganhou ${roundRecap.points} pontos`}
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
                        const relativePos = (pos - myPos + 4) % 4

                        let style = {}
                        if (relativePos === 0) style = { transform: 'translateY(20px)' }
                        if (relativePos === 1) style = { transform: 'translateX(-20px) rotate(90deg)' }
                        if (relativePos === 2) style = { transform: 'translateY(-20px)' }
                        if (relativePos === 3) style = { transform: 'translateX(20px) rotate(-90deg)' }

                        return (
                            <div key={`trick-${c.player_id}`} className="absolute transition-all duration-300" style={style}>
                                {renderCard(c.card, undefined, false)}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Bottom Player (Me) */}
            <div className="absolute bottom-6 sm:bottom-10 w-full flex flex-col items-center z-20">
                <div className="flex -space-x-[2.8rem] sm:-space-x-[3.5rem] mb-6 sm:mb-8 px-2 py-2 hover:-space-x-[2rem] transition-all duration-300 ease-out perspective-1000 max-w-[95vw] overflow-visible justify-center" role="group" aria-label="As suas cartas">
                    {sortHand(myPlayer.hand || []).map((card: string, index: number) => {
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
                            <Image src={myPlayer.profiles.avatar_url} alt={myPlayer.profiles?.username || 'Eu'} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-6 h-6" /></div>
                        )}
                    </div>
                    <span className="text-white font-bold text-shadow-sm">{myPlayer.profiles?.username || 'Eu'}</span>
                    <div className="h-full w-px bg-white/20 mx-2" />
                    {gameState.trump_card && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 border border-yellow-300 px-3 py-0.5 sm:py-1 rounded-full shadow-[0_0_10px_rgba(255,215,0,0.4)] relative mt-[-2px]">
                            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest drop-shadow-md pr-1">Trunfo</span>
                            <div className="relative w-6 h-8 sm:w-7 sm:h-10 overflow-hidden rounded-[4px] shadow-sm border border-white/50 bg-white transform rotate-3">
                                <Image src={getCardAssetPath(gameState.trump_card)} alt={`Trunfo: ${gameState.trump_card}`} fill className="object-cover" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Trump Card Intro Animation */}
            {showTrumpAnimation && gameState.trump_card && (
                <TrumpAnimation trumpCard={gameState.trump_card} isFadingOut={isFadingOutTrump} />
            )}

            {/* Game Result Overlay */}
            {gameResult && (
                <GameResultOverlay
                    gameResult={gameResult}
                    stake={gameState.stake || 0}
                    isTraining={isTraining}
                    isDemoGuest={isDemoGuest}
                    onExit={() => {
                        localStorage.removeItem('sueca_training_state');
                        localStorage.removeItem('sueca_training_scores');
                        router.push(isDemoGuest ? '/' : '/dashboard');
                    }}
                    onNewGame={() => {
                        localStorage.removeItem('sueca_training_state');
                        localStorage.removeItem('sueca_training_scores');
                        startTrainingGame()
                    }}
                    onRegister={() => router.push('/register')}
                />
            )}

            {/* Invite Friend Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-foreground text-base">Convidar Amigo</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {inviteTeam && (
                            <p className="text-xs text-muted-foreground mb-4">
                                {inviteTeam === 'A'
                                    ? '🟢 Equipa A — vai jogar no teu time'
                                    : '🔴 Equipa B — vai jogar contra ti'}
                            </p>
                        )}

                        {inviteFriends.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">Não tens amigos online para convidar.</p>
                        ) : (
                            <ul className="space-y-2 max-h-64 overflow-y-auto">
                                {inviteFriends.map(friend => (
                                    <li key={friend.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors">
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                                            {friend.avatar_url ? (
                                                <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                                                    {friend.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="flex-1 text-sm font-medium text-foreground truncate">{friend.username}</span>
                                        <button
                                            onClick={() => handleSendInvite(friend.id)}
                                            disabled={!!inviteSent[friend.id]}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${inviteSent[friend.id] ? 'bg-success/20 text-success cursor-default' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
                                        >
                                            {inviteSent[friend.id] ? <><Check className="w-3.5 h-3.5" /> Enviado</> : <><UserPlus className="w-3.5 h-3.5" /> Convidar</>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Game Cancelled Overlay */}
            {gameCancelled && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-card rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl border border-border animate-in zoom-in-95 fade-in duration-300">
                        <div className="text-5xl mb-4">🚫</div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Mesa Cancelada</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            O anfitrião cancelou a mesa. O teu saldo foi devolvido automaticamente.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/play')}
                            className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors"
                        >
                            Voltar ao Lobby
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
