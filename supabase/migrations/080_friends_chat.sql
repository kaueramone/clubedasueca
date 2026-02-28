-- ============================================
-- Migration 080: Friends & Direct Chat System
-- ============================================

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');

-- ============================================
-- FRIENDSHIPS
-- ============================================
CREATE TABLE public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- user1_id is always the smaller UUID to ensure uniqueness regardless of who initiated
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status friendship_status DEFAULT 'pending',
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Who sent the request
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TABLE public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON public.chat_messages(receiver_id);
CREATE INDEX idx_chat_created ON public.chat_messages(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Friendships Policies
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND (auth.uid() = user1_id OR auth.uid() = user2_id));

CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Chat Messages Policies
CREATE POLICY "Users can view their messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received messages (mark as read)" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = receiver_id);
