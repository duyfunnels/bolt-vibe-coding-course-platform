/*
  # Add text content to lessons

  ## Changes
  1. Add `content` (text) column to `lessons` for rich text / markdown content shown below the video.

  ## Notes
  - Default is empty string so existing lessons remain unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'content'
  ) THEN
    ALTER TABLE lessons ADD COLUMN content text DEFAULT '';
  END IF;
END $$;
