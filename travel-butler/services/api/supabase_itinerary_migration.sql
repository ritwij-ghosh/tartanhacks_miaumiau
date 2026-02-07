-- =============================================================
-- Travel Butler — Itinerary System Migration
-- Run this in Supabase SQL Editor.
-- Adds itinerary-specific columns to existing plans + plan_steps tables.
-- =============================================================

-- ─── 1. Add columns to plans table ──────────────────────────
-- These support the itinerary workflow (draft → confirmed → executing → completed)

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS destination          text default '',
  ADD COLUMN IF NOT EXISTS start_date           text,
  ADD COLUMN IF NOT EXISTS end_date             text,
  ADD COLUMN IF NOT EXISTS estimated_total_usd  float default 0,
  ADD COLUMN IF NOT EXISTS status               text default 'draft'
    CHECK (status IN ('draft', 'confirmed', 'executing', 'completed', 'cancelled'));

-- ─── 2. Add columns to plan_steps table ─────────────────────
-- These support agent dispatching and result tracking per step.

-- Drop the old category constraint so we can add new types
ALTER TABLE public.plan_steps
  DROP CONSTRAINT IF EXISTS plan_steps_category_check;

ALTER TABLE public.plan_steps
  ADD COLUMN IF NOT EXISTS user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS date           text,
  ADD COLUMN IF NOT EXISTS step_type      text default 'activity',
  ADD COLUMN IF NOT EXISTS agent          text default '',
  ADD COLUMN IF NOT EXISTS action_payload jsonb default '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status         text default 'pending'
    CHECK (status IN ('pending', 'searching', 'found', 'booked', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS result         jsonb,
  ADD COLUMN IF NOT EXISTS notes          text,
  ADD COLUMN IF NOT EXISTS location       jsonb,
  ADD COLUMN IF NOT EXISTS estimated_price_usd float default 0;

-- Re-add category constraint with broader values
ALTER TABLE public.plan_steps
  ADD CONSTRAINT plan_steps_category_check
  CHECK (category IN ('flight', 'hotel', 'dining', 'activity', 'transit'));

-- ─── 3. Add RLS policies for plan_steps (user_id based) ────
-- The original plan_steps RLS was based on plan ownership.
-- Now we also add direct user_id policies for the new column.

DROP POLICY IF EXISTS "Users can update own plan steps" ON public.plan_steps;
CREATE POLICY "Users can update own plan steps"
  ON public.plan_steps FOR UPDATE
  USING (plan_id IN (SELECT id FROM public.plans WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own plan steps" ON public.plan_steps;
CREATE POLICY "Users can delete own plan steps"
  ON public.plan_steps FOR DELETE
  USING (plan_id IN (SELECT id FROM public.plans WHERE user_id = auth.uid()));

-- ─── 4. Indexes for the new columns ────────────────────────
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_destination ON public.plans(destination);
CREATE INDEX IF NOT EXISTS idx_plan_steps_type ON public.plan_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_plan_steps_status ON public.plan_steps(status);
CREATE INDEX IF NOT EXISTS idx_plan_steps_date ON public.plan_steps(date);
