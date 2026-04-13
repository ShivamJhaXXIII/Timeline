CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    captured_at TEXT NOT NULL,
    screenshot_path TEXT NOT NULL UNIQUE,
    window_title TEXT NOT NULL DEFAULT '',
    app_name TEXT NOT NULL DEFAULT '',
    app_path TEXT,
    is_idle INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_captures_captured_at ON captures (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_captures_app_name ON captures (app_name);
