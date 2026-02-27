-- ============================================
-- Migration 060: Suporte & Live Chat
-- Conversas, mensagens realtime e bot FAQ
-- ============================================

CREATE TYPE conversation_status AS ENUM ('open', 'waiting_agent', 'active', 'resolved', 'closed');

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE public.live_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,     -- Null = bot ou na fila
  status conversation_status DEFAULT 'open',
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.live_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.live_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,    -- Null = bot automatizado
  is_bot BOOLEAN DEFAULT FALSE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user ON public.live_conversations(user_id);
CREATE INDEX idx_conversations_status ON public.live_conversations(status);
CREATE INDEX idx_messages_conversation ON public.live_messages(conversation_id);
CREATE INDEX idx_messages_created ON public.live_messages(created_at);

-- RLS
ALTER TABLE public.live_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own conversations
CREATE POLICY "Users can manage own conversations" ON public.live_conversations
  FOR ALL USING (auth.uid() = user_id);

-- Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations" ON public.live_conversations
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Users can read/insert messages in their own conversations
CREATE POLICY "Users flow in messages" ON public.live_messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM public.live_conversations WHERE user_id = auth.uid())
  );

-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages" ON public.live_messages
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- System can insert bot messages
-- Security definer functions will handle bot replies
