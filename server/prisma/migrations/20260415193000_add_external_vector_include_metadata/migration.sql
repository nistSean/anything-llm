-- Add externalVectorIncludeMetadata field to workspaces table
-- This enables including file path, line numbers in LLM context for external collections

ALTER TABLE workspaces ADD COLUMN externalVectorIncludeMetadata BOOLEAN DEFAULT false;
