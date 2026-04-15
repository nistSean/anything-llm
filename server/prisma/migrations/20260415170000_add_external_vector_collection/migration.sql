-- Add external vector collection fields to workspaces table
-- This enables workspaces to use existing Qdrant collections (like those created by Roo Code)

ALTER TABLE workspaces ADD COLUMN externalVectorCollection TEXT;
ALTER TABLE workspaces ADD COLUMN externalVectorSchemaMapping TEXT;
ALTER TABLE workspaces ADD COLUMN externalVectorReadOnly BOOLEAN DEFAULT true;
