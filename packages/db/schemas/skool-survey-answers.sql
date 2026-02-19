-- =============================================
-- ADD SURVEY ANSWERS + PHONE TO SKOOL MEMBERS
-- =============================================
-- Stores the 3 membership question answers from Skool
-- Shape: [{"question": "...", "answer": "..."}, ...]
-- Also adds phone (extracted from survey answers)
-- Run in Supabase SQL Editor

ALTER TABLE skool_members
  ADD COLUMN IF NOT EXISTS survey_answers JSONB;

ALTER TABLE skool_members
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN skool_members.survey_answers IS 'Membership survey Q&A from Skool join flow. Array of {question, answer} objects.';
COMMENT ON COLUMN skool_members.phone IS 'Phone number extracted from survey answers.';
