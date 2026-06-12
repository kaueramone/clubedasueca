-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Public user data)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WALLETS (User balance)
CREATE TABLE public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
  currency TEXT DEFAULT 'MZN' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS (Financial history)
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus');

CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  reference_id UUID, -- Can link to game_id or withdrawal_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WITHDRAWALS (Cashout requests)
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 10), -- Min withdrawal 10
  status withdrawal_status DEFAULT 'pending' NOT NULL,
  admin_note TEXT,
  pix_key TEXT, -- For MB Way simulation or actually bank details
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAMES (Sueca tables)
CREATE TYPE game_status AS ENUM ('waiting', 'playing', 'finished', 'cancelled');

CREATE TABLE public.games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status game_status DEFAULT 'waiting' NOT NULL,
  stake DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  host_id UUID REFERENCES public.profiles(id),
  winner_team TEXT, -- 'A' or 'B'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAME PLAYERS
CREATE TABLE public.game_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0 AND position <= 3),
  team TEXT NOT NULL, -- 'A' (pos 0, 2) or 'B' (pos 1, 3)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, position),
  UNIQUE(game_id, user_id)
);

-- GAME MOVES (Card plays)
CREATE TABLE public.game_moves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) NOT NULL,
  card TEXT NOT NULL, -- e.g., 'Ah', '7d', etc.
  round_number INTEGER NOT NULL,
  trick_number INTEGER NOT NULL,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPORT TICKETS
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TABLE public.support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status ticket_status DEFAULT 'open' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.support_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL, -- Could be user or admin
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HOUSE REVENUE
CREATE TABLE public.house_revenue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES (Basic examples, need refinement)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- TRIGGER: Create Profile and Wallet on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 0.00);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
