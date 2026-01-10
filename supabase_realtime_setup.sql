-- Complete setup for user_status table with realtime support

-- 1. Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS public.user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  current_seconds INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_items JSONB DEFAULT '[]'::jsonb
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can insert their own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can update their own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can delete their own status" ON public.user_status;

-- 4. Create comprehensive RLS policies
CREATE POLICY "Users can view their own status"
  ON public.user_status
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status"
  ON public.user_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status"
  ON public.user_status
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status"
  ON public.user_status
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;

-- 6. Verify setup
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_status';
