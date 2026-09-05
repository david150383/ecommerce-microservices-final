ALTER TABLE refresh_sessions
ADD COLUMN family_id UUID NOT NULL;

CREATE INDEX idx_refresh_sessions_family_id
    ON refresh_sessions(family_id);