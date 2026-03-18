-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS api_checks CASCADE;
DROP TABLE IF EXISTS apis CASCADE;

-- APIs table: stores manually added API endpoints to monitor
CREATE TABLE apis (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  auth_required VARCHAR(50) DEFAULT 'No',
  https_supported BOOLEAN DEFAULT true,
  base_url TEXT,
  method VARCHAR(10) NOT NULL DEFAULT 'GET',
  headers JSONB,
  body TEXT,
  expected_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_url, method)
);

-- Index for efficient filtering by category
CREATE INDEX idx_apis_category ON apis(category);

-- API checks table: stores monitoring results
CREATE TABLE api_checks (
  id SERIAL PRIMARY KEY,
  api_id INTEGER NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  status_code INTEGER,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient history queries per API
CREATE INDEX idx_api_checks_api_id ON api_checks(api_id);
CREATE INDEX idx_api_checks_checked_at ON api_checks(checked_at DESC);
