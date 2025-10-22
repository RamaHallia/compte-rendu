-- Add SMTP configuration fields to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS smtp_host TEXT,
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_user TEXT,
ADD COLUMN IF NOT EXISTS smtp_password TEXT,
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN user_settings.smtp_host IS 'SMTP server hostname (e.g., smtp.gmail.com)';
COMMENT ON COLUMN user_settings.smtp_port IS 'SMTP server port (587 for TLS, 465 for SSL)';
COMMENT ON COLUMN user_settings.smtp_user IS 'SMTP authentication username/email';
COMMENT ON COLUMN user_settings.smtp_password IS 'SMTP authentication password (stored encrypted)';
COMMENT ON COLUMN user_settings.smtp_secure IS 'Use TLS/SSL for SMTP connection';

-- Update email_method to include smtp option
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS user_settings_email_method_check;

ALTER TABLE user_settings
ADD CONSTRAINT user_settings_email_method_check 
CHECK (email_method IN ('gmail', 'local', 'smtp'));

