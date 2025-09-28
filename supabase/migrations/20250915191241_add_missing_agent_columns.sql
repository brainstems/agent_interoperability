-- Add missing columns to agent_definitions table
-- Created: 2025-09-15

-- Add missing columns that tests expect
ALTER TABLE agent_definitions ADD COLUMN IF NOT EXISTS is_specialized BOOLEAN DEFAULT false;

-- Add missing agent-related tables that tests expect (create crew_definitions first)
CREATE TABLE IF NOT EXISTS crew_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    process_type VARCHAR(50) DEFAULT 'sequential',
    manager_llm_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    max_rpm INTEGER DEFAULT 10,
    memory_enabled BOOLEAN DEFAULT true,
    is_verbose BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(church_id, name)
);

CREATE TABLE IF NOT EXISTS crew_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES crew_definitions(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING',
    inputs JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER,
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,4) DEFAULT 0.00,
    triggered_by VARCHAR(100),
    trigger_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Enable RLS for new tables
ALTER TABLE crew_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_definitions ENABLE ROW LEVEL SECURITY;