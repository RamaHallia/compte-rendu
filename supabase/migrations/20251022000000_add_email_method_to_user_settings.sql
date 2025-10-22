-- Add email_method column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS email_method TEXT DEFAULT 'gmail' CHECK (email_method IN ('gmail', 'local'));

-- Add comment
COMMENT ON COLUMN user_settings.email_method IS 'Preferred email sending method: gmail or local';

