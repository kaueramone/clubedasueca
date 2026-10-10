'use client'

import { useEffect, useState, useRef, useCallback, useMemo, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { playCard, cancelGame, leaveGame, playTimeoutCard, getFriendsForInvite, sendTableInvite } from './actions'
import { tableFromSnapshot, trainingMove, settleTrainingTrick, cardLabel } from './table-state'
import { cn } from '@/lib/utils'
import { generateDeck, shuffleDeck, getTrickWinner, isValidMove, getCardSuit, getCardValue, sortHand } from './utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Clock, User, ArrowLeft, LogOut, RotateCcw, UserPlus, X, Check } from 'lucide-react'

import { PlayerAvatar } from './components/player-avatar'
import { ScoreBoard } from './components/score-board'
import { GameChat, GameChatToggle } from './components/game-chat'
import { GameResultOverlay } from './components/game-result-overlay'
import { TrumpAnimation } from './components/trump-animation'
import { CardArt } from './components/card-art'
import styles from './game-table.module.css'
import { anchorServerClock, serverSecondsLeft, type ServerClock } from './server-clock'

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
    const [turnTimeLeft, setTurnTimeLeft] = useState(0)
    const [serverClock, setServerClock] = useState<ServerClock | null>(null)
    const [sendingChat, setSendingChat] = useState(false)
    const [chatError, setChatError] = useState<string | null>(null)
    const sendingChatRef = useRef(false)
    const chatRequestRef = useRef<{ text: string; id: string } | null>(null)
    const seenMessagesRef = useRef<Set<string> | null>(null)

    // Chat State
    const [messages, setMessages] = useState<{ sender: string, text: string, time: string, isBot?: boolean, authorId?: string }[]>([])
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
    const [showTrumpExpanded, setShowTrumpExpanded] = useState(false)
    const hasShownTrumpRef = useRef(false)

    // Audio refs
    const audioPlaceRef = useRef<HTMLAudioElement | null>(null)
    const audioShuffleRef = useRef<HTMLAudioElement | null>(null)
    const audioCollectRef = useRef<HTMLAudioElement | null>(null)

    const supabase = useMemo(() => createClient(), [])
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [storageReady, setStorageReady] = useState(false)
    const timeoutActionRef = useRef<() => void>(() => {})
    const chatOpenRef = useRef(showChat)
    chatOpenRef.current = showChat

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
        const result = await sendTableInvite(gameId, friendId, inviteTeam || undefined)
        if (result?.error) { alert(result.error); return }
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

    // Versioned, single-record persistence avoids mismatched hands and scores on reload.
    useEffect(() => {
        if (!isTraining) return
        try {
            const saved = JSON.parse(localStorage.getItem('sueca_training_v2') || 'null')
            if (saved?.game_players?.length === 4 && saved.trump_card) setGameState(saved)
            else startTrainingGame()
        } catch { startTrainingGame() }
        setStorageReady(true)
    }, [isTraining])

    useEffect(() => {
        if (isTraining && storageReady) {
            try { localStorage.setItem('sueca_training_v2', JSON.stringify(gameState)) } catch { /* Storage may be unavailable in private browsing. */ }
        }
        setScores({ A: gameState?.score_a ?? 0, B: gameState?.score_b ?? 0 })
        if (gameState?.status === 'finished') setGameResult({ winnerTeam: gameState.winner_team || 'Draw', scoreA: gameState.score_a ?? 0, scoreB: gameState.score_b ?? 0 })
        if (gameState?.status === 'cancelled') setGameCancelled(true)
    }, [gameState, isTraining, storageReady])

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
            status: 'playing', current_turn: 0, rounds: [], current_trick_cards: [], score_a: 0, score_b: 0, winner_team: null,
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
            // Usa hand_count quando existe (multiplayer; a mão dos adversários
            // vem vazia por segurança) e cai para hand.length no treino.
            const isFreshStart = gameState.game_players.every((p: any) => (p.hand_count ?? p.hand?.length ?? 0) === 10);

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
    }, [gameState?.status, gameState?.trump_card])

    // A deadline survives renders; the ref invokes the latest hand, never a stale closure.
    useEffect(() => {
        if (!gameState || gameResult || isTrickProcessing || roundRecap || gameState.status !== 'playing' || gameState.current_trick_cards.length === 4) return
        if (isTraining && (gameState.current_turn !== 0 || !storageReady)) return
        const clock = isTraining ? { remainingMs: 15000, receivedAt: performance.now() } : serverClock
        if (!clock) return
        let attempted = false
        const tick = () => {
            const remaining = serverSecondsLeft(clock, performance.now())
            setTurnTimeLeft(remaining)
            if (remaining === 0 && !attempted) { attempted = true; timeoutActionRef.current() }
        }
        tick()
        const interval = setInterval(tick, 250)
        return () => clearInterval(interval)
    }, [serverClock, gameState.current_turn, gameState.turn_deadline, gameState.current_trick_cards.length, gameResult, isTrickProcessing, roundRecap, gameState.status, isTraining, storageReady])

    const autoPlayOnline = useCallback(async () => {
        if (!game || isTraining) return
        setLoading(true)
        try {
            const res = await playTimeoutCard(game.id)
            if (res?.error) console.error('[AUTO_PLAY_ERROR]', res.error)
        } catch {
            setConnectionError('Jogada automática não confirmada. A recuperar o estado da mesa…')
        } finally {
            setLoading(false)
            await refreshSnapshotRef.current()
        }
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

    timeoutActionRef.current = isTraining ? autoPlayHuman : autoPlayOnline

    useEffect(() => {
        if (!roundRecap) return
        const timer = setTimeout(() => {
            if (roundRecap.timeLeft <= 1) dismissRecap()
            else setRoundRecap(prev => prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null)
        }, 1000)
        return () => clearTimeout(timer)
    }, [roundRecap])

    // Bot Logic Effect
    useEffect(() => {
        if (!isTraining || !gameState || gameState.status !== 'playing' || isTrickProcessing || gameResult || roundRecap || gameState.current_trick_cards.length === 4) return

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
        setGameState((prev: any) => trainingMove(prev, playerId, card))
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

    useEffect(() => {
        if (!isTraining || gameState.current_trick_cards.length !== 4) return
        setIsTrickProcessing(true)
        const trick = gameState.current_trick_cards
        const trump = getCardSuit(gameState.trump_card)
        const winnerId = getTrickWinner(trick, trump)
        const winner = gameState.game_players.find((p: any) => p.user_id === winnerId)
        const timer = setTimeout(() => {
            playSound('collect')
            setRoundRecap({ winner: winner.profiles.username, points: trick.reduce((sum: number, c: any) => sum + getCardValue(c.card), 0), team: winner.team, explanation: buildTrickExplanation(trick, winnerId, trump), timeLeft: 5 })
        }, 1200)
        return () => clearTimeout(timer)
    }, [isTraining, gameState.current_trick_cards, gameState.trump_card, buildTrickExplanation, playSound])

    const dismissRecap = useCallback(() => {
        setGameState((state: any) => settleTrainingTrick(state))
        setIsTrickProcessing(false)
        setRoundRecap(null)
    }, [])

    // Realtime Subscription & Chat Channel

    const refreshSnapshotRef = useRef<() => Promise<void>>(async () => {})
    useEffect(() => {
        if (isTraining || !game?.id) return
        seenMessagesRef.current = null
        setMessages([])
        setUnreadCount(0)
        setServerClock(null)
        let disposed = false
        let inFlight = false
        let refreshAgain = false
        let removed = false
        const refresh = async () => {
            if (disposed || removed) return
            if (inFlight) { refreshAgain = true; return }
            inFlight = true
            try {
                do {
                    refreshAgain = false
                    const startedAt = performance.now()
                    const { data, error } = await supabase.rpc('get_table_state', { p_game_id: game.id })
                    if (!disposed && !removed) {
                        if (error?.code === 'P0002') {
                            removed = true
                            setLoading(false)
                            setConnectionError(null)
                            setGameCancelled(true)
                            break
                        }
                        if (error?.code === '42501') {
                            setConnectionError('Acesso à mesa indisponível. Confirma a tua sessão ou regressa às mesas.')
                            break
                        }
                        if (error) throw error
                        const receivedAt = performance.now()
                        setServerClock(anchorServerClock(data.game.turn_deadline, data.game.server_now, receivedAt, receivedAt - startedAt))
                        setGameState(tableFromSnapshot(data as any))
                        setConnectionError(null)
                        const history = await supabase.from('game_messages').select('id,author_id,sender,text,created_at')
                            .eq('game_id', game.id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100)
                        if (!disposed && !removed) {
                            if (history.error) setChatError('Não foi possível atualizar o chat. A tentar novamente…')
                            else {
                                const rows = (history.data ?? []).reverse()
                                const seen = seenMessagesRef.current
                                const newCount = seen ? rows.filter(m => !seen.has(m.id) && m.author_id !== currentUser?.id).length : 0
                                seenMessagesRef.current = new Set(rows.map(m => m.id))
                                if (!seen || seen.size !== rows.length || rows.some(m => !seen.has(m.id))) {
                                    setMessages(rows.map(m => ({ sender: m.sender, text: m.text, authorId: m.author_id,
                                        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })))
                                }
                                if (!chatOpenRef.current && newCount) setUnreadCount(prev => prev + newCount)
                            }
                        }
                    }
                } while (refreshAgain && !disposed && !removed)
            } catch {
                if (!disposed && !removed) setConnectionError('A recuperar a ligação à mesa. As jogadas estão temporariamente suspensas.')
            } finally {
                inFlight = false
            }
        }
        refreshSnapshotRef.current = refresh
        const channel = supabase.channel(`game-${game.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game.id}` }, payload => {
                // DELETE events may not retain the subscription filter; match the key explicitly.
                if (payload.eventType === 'DELETE' && payload.old.id === game.id) {
                    removed = true
                    setLoading(false)
                    setConnectionError(null)
                    setGameCancelled(true)
                } else { void refresh() }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${game.id}` }, () => { void refresh() })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_id=eq.${game.id}` }, () => { void refresh() })
            .subscribe(status => {
                if (status === 'SUBSCRIBED') void refresh()
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionError('Ligação interrompida. A recuperar o estado da mesa…')
            })
        void refresh()
        const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
        window.addEventListener('online', refresh)
        document.addEventListener('visibilitychange', onVisible)
        const poll = setInterval(refresh, 5000)
        return () => {
            disposed = true
            clearInterval(poll)
            window.removeEventListener('online', refresh)
            document.removeEventListener('visibilitychange', onVisible)
            void supabase.removeChannel(channel)
        }
    }, [game?.id, supabase, isTraining, currentUser?.id])

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        const text = newMessage.trim()
        if (!text || sendingChatRef.current) return
        setChatError(null)
        if (isTraining) {
            setMessages(prev => [...prev, { sender: gameState?.game_players?.[0]?.profiles?.username || 'Você', text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
            setNewMessage('')
            return
        }
        sendingChatRef.current = true
        setSendingChat(true)
        if (chatRequestRef.current?.text !== text) chatRequestRef.current = { text, id: crypto.randomUUID() }
        try {
            const { error } = await supabase.rpc('send_game_message', {
                p_game_id: game.id, p_text: text, p_request_id: chatRequestRef.current.id
            })
            if (error) throw error
            chatRequestRef.current = null
            setNewMessage('')
            await refreshSnapshotRef.current()
        } catch (error) {
            setChatError(error instanceof Error ? error.message : (error as { message?: string })?.message || 'Mensagem não enviada. Tenta novamente.')
        } finally {
            sendingChatRef.current = false
            setSendingChat(false)
        }
    }, [newMessage, isTraining, gameState?.game_players, game?.id, supabase])

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
        if (loading || connectionError || isTrickProcessing || roundRecap || gameState.current_turn !== myPlayer?.position) return

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
        try {
            const res = await playCard(game.id, card)
            if (res?.error) alert(res.error)
            await refreshSnapshotRef.current()
        } catch {
            setConnectionError('Jogada não confirmada. A recuperar o estado da mesa…')
            await refreshSnapshotRef.current()
        } finally { setLoading(false) }
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

    const renderSeat = (player: any, side: 'Top' | 'Left' | 'Right', offset: number) => {
        // Multiplayer exposes only the count; never request opponents' card faces.
        const count = player?.hand_count ?? player?.hand?.length ?? 0
        const active = gameState.status === 'playing' && player?.position === gameState.current_turn
        const name = player?.profiles?.username?.split(' ')[0] || 'Aguardar'
        return (
            <div className={cn(styles.seat, styles[`seat${side}`])} data-active={active}>
                <div className={styles.player}>
                    <PlayerAvatar player={player} gameStatus={gameState.status} borderColorClass={getAvatarBorderColor(player)} onInvite={isHost && !player ? () => openSeatInvite((myPos + offset) % 4) : undefined} />
                    <span className={styles.playerName} title={player?.profiles?.username}>{name}</span>
                    {active && <span className={styles.turnLabel}>A jogar</span>}
                </div>
                {count > 0 && <div className={styles.opponentHand} aria-label={`${name}: ${count} cartas`}>
                    <div className={styles.opponentStack} aria-hidden="true">
                        {Array.from({ length: Math.min(count, 3) }, (_, i) => <div key={i} className={styles.opponentCard} style={{ '--stack-index': i } as CSSProperties}><CardArt back /></div>)}
                    </div>
                    <span className={styles.cardCount} aria-hidden="true">{count}</span>
                </div>}
            </div>
        )
    }
    const isMyTurn = gameState.status === 'playing' && gameState.current_turn === myPos && !roundRecap && !gameResult
    const suitNames: Record<string, string> = { hearts: 'Copas', diamonds: 'Ouros', clubs: 'Paus', spades: 'Espadas' }
    const leadCard = gameState.current_trick_cards[0]?.card
    const handHint = selectedCard ? `${cardLabel(selectedCard)} · Toca novamente para jogar.`
        : leadCard ? `Segue ${suitNames[getCardSuit(leadCard)]}, se tiveres esse naipe.`
        : 'Toca para selecionar; toca novamente para jogar.'

    const currentUsername = isTraining
        ? (gameState?.game_players?.[0]?.profiles?.username || 'Você')
        : (currentUser?.profiles?.username || 'Você')

    return (
        <div className={styles.table} data-testid="game-table">
            {/* Background Images */}
            <div className={styles.background}>
                <Image src="/images/mesa-horizontal.png" alt="Mesa de jogo" fill sizes="100vw" className="object-cover hidden md:block" priority />
                <Image src="/images/mesa-vert.png" alt="Mesa de jogo" fill sizes="100vw" className="object-cover md:hidden" priority />
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
            </div>

            <header className={styles.toolbar} aria-label="Controlos e placar">
            <div className={styles.controls}>
                {/* Exit/Back Button (Training or Demo) */}
                {(isTraining || isDemoGuest) && (
                    <button
                        onClick={() => {
                            if (confirm('Deseja cancelar esta partida de treino? O progresso será perdido.')) {
                                localStorage.removeItem('sueca_training_v2');
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

            <ScoreBoard scoreA={scores.A} scoreB={scores.B} myTeam={myPlayer?.team || 'A'} />
            </header>

            {/* Chat Panels */}
            <GameChat
                showChat={showChat}
                setShowChat={setShowChat}
                messages={messages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={handleSendMessage}
                currentUsername={currentUsername}
                currentUserId={isTraining ? undefined : currentUser?.id}
                sending={sendingChat}
                error={chatError}
            />

            {connectionError && <p role="alert" className={styles.connection}>{connectionError}</p>}

            <section className={styles.arena} aria-label="Mesa e jogadores">
                {renderSeat(pTop, 'Top', 2)}
                {renderSeat(pLeft, 'Left', 1)}
                {renderSeat(pRight, 'Right', 3)}
                <div className={styles.trick} aria-label="Vaza atual">
                    <div className={styles.tableMark}>
                        <Image src="/images/favicon.png" alt="" fill sizes="256px" className="object-contain" aria-hidden="true" />
                    </div>
                    {isMyTurn && <div className={styles.timer} data-urgent={turnTimeLeft <= 5} role="timer" aria-label={`Tempo restante: ${turnTimeLeft} segundos`}>
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" /><span>{turnTimeLeft}s</span>
                    </div>}

                {/* Waiting State Overlay */}
                {gameState.status === 'waiting' && !isTraining && (
                    <div className={styles.tableOverlay}>
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
                    <button type="button" onClick={dismissRecap} className={cn(styles.tableOverlay, styles.recap)} aria-label={`${roundRecap.winner} ganhou ${roundRecap.points} pontos. Continuar.`}>
                        <strong>{roundRecap.winner} · +{roundRecap.points}</strong>
                        <span>{roundRecap.explanation}</span>
                        <small>Próxima em {roundRecap.timeLeft}s · Toca para continuar</small>
                    </button>
                )}
                {gameState.current_trick_cards?.map((c: any) => {
                    const player = gameState.game_players.find((p: any) => p.user_id === c.player_id)
                    const relativePos = ((player?.position ?? 0) - myPos + 4) % 4
                    return <div key={`trick-${c.player_id}`} className={styles.playedCard} data-seat={relativePos}>
                        <CardArt card={c.card} label={`${player?.profiles?.username || 'Jogador'}: ${cardLabel(c.card)}`} />
                    </div>
                })}
                </div>
            </section>

            <section className={styles.handDock} aria-label="A tua mão">
                <p id="hand-instructions" className={styles.handHint} data-active={isMyTurn}>
                    <strong>{connectionError ? 'A recuperar ligação…' : roundRecap ? 'Vaza concluída' : loading ? 'A confirmar jogada…' : isMyTurn ? 'A tua vez' : gameState.status === 'waiting' ? 'À espera de jogadores' : 'Aguarda a tua vez'}</strong>
                    {handHint}
                </p>
                <div className={styles.handCards} role="group" aria-label="As tuas cartas" aria-describedby="hand-instructions">
                    {sortHand(myPlayer?.hand || []).map((card: string) => {
                        const legal = isValidMove(card, myPlayer.hand, leadCard ? getCardSuit(leadCard) : null)
                        const enabled = legal && isMyTurn && !loading && !isTrickProcessing && !connectionError
                        return <button key={card} type="button" aria-label={`${cardLabel(card)}${legal ? '' : ', deves seguir o naipe'}`} aria-pressed={selectedCard === card} disabled={!enabled} onClick={() => handlePlayCard(card)} className={styles.handCard} data-legal={legal}>
                            <CardArt card={card} />
                        </button>
                    })}
                </div>
                <div className={styles.playerFooter}>
                    <div className={styles.self}>
                        <div className={styles.selfAvatar}>
                            {myPlayer?.profiles?.avatar_url ? <Image src={myPlayer.profiles.avatar_url} alt="" fill sizes="32px" className="object-cover" /> : <User className="w-5 h-5" aria-hidden="true" />}
                        </div>
                        <span className={styles.selfName}>{myPlayer?.profiles?.username || 'Você'}</span>
                    </div>
                    {gameState.trump_card && <div className={styles.trump}>
                        <button type="button" className={styles.trumpButton} aria-label={`Trunfo: ${cardLabel(gameState.trump_card)}`} aria-expanded={showTrumpExpanded} onClick={() => setShowTrumpExpanded(prev => !prev)} onBlur={() => setShowTrumpExpanded(false)}>
                            <span>Trunfo</span><span className={styles.trumpMini}><CardArt card={gameState.trump_card} /></span>
                        </button>
                        {showTrumpExpanded && <div className={styles.trumpPopover}><CardArt card={gameState.trump_card} label={`Trunfo: ${cardLabel(gameState.trump_card)}`} /></div>}
                    </div>}
                </div>
            </section>
            <p className={styles.beta}>Teste gratuito · Sem dinheiro real · Saldos repostos a zero no lançamento</p>

            {/* Trump Card Intro Animation */}
            {showTrumpAnimation && gameState.trump_card && (
                <TrumpAnimation trumpCard={gameState.trump_card} isFadingOut={isFadingOutTrump} />
            )}

            {/* Game Result Overlay */}
            {gameResult && (
                <GameResultOverlay
                    gameResult={gameResult}
                    myTeam={myPlayer?.team || 'A'}
                    stake={gameState.stake || 0}
                    isTraining={isTraining}
                    isDemoGuest={isDemoGuest}
                    onExit={() => {
                        localStorage.removeItem('sueca_training_v2');
                        localStorage.removeItem('sueca_training_scores');
                        router.push(isDemoGuest ? '/' : '/dashboard');
                    }}
                    onNewGame={() => {
                        localStorage.removeItem('sueca_training_v2');
                        localStorage.removeItem('sueca_training_scores');
                        if (isTraining) startTrainingGame()
                        else router.push('/dashboard/play')
                    }}
                    onRegister={() => router.push('/register')}
                />
            )}

            {/* Invite Friend Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[300] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 my-auto max-h-[90dvh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-foreground text-base">Convidar Amigo</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {inviteTeam && (
                            <p className="text-xs text-muted-foreground mb-4">
                                {inviteTeam === myPlayer?.team ? 'Vai jogar na tua equipa' : 'Vai jogar na equipa adversária'}
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
                <div className="fixed inset-0 z-[500] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-card rounded-2xl p-8 text-center max-w-sm w-full my-auto max-h-[90dvh] overflow-y-auto shadow-2xl border border-border animate-in zoom-in-95 fade-in duration-300">
                        <div className="text-5xl mb-4">🚫</div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Mesa Cancelada</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            A mesa foi cancelada ou expirou. Consulta a carteira para confirmar a devolução dos créditos de teste.
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
