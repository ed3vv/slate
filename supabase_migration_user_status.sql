-- Migration: Add missing session_items column to user_status table
-- Run this in your Supabase SQL Editor

-- Add session_items column if it doesn't exist
ALTER TABLE public.user_status
ADD COLUMN IF NOT EXISTS session_items JSONB DEFAULT '[]'::jsonb;

-- Verify the table structure
-- You can uncomment the line below to see all columns
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'user_status';
