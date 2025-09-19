-- Migration: Add missing TaskType and TaskCategory values
-- Run this migration to update the database schema

-- Add new TaskType enum values
ALTER TYPE "TaskType" ADD VALUE 'EXECUTION';
ALTER TYPE "TaskType" ADD VALUE 'QUALITY_CHECK'; 
ALTER TYPE "TaskType" ADD VALUE 'DOCUMENTATION';
ALTER TYPE "TaskType" ADD VALUE 'CLIENT_INTERACTION';

-- Add GENERAL to TaskCategory if it doesn't exist
ALTER TYPE "TaskCategory" ADD VALUE 'GENERAL';

-- Update any existing tasks that might have invalid types
-- (This is a safety measure in case there are existing records with problematic values)
UPDATE "tasks" 
SET "type" = 'EXECUTION'
WHERE "type" NOT IN (
  'BATHROOM_CLEANING', 'WINDOW_CLEANING', 'FLOOR_CLEANING', 'SURFACE_CLEANING',
  'DETAIL_FINISHING', 'SETUP', 'CLEANUP', 'EXECUTION', 'QUALITY_CHECK', 
  'DOCUMENTATION', 'CLIENT_INTERACTION'
);

-- Update any tasks with invalid categories
UPDATE "tasks" 
SET "category" = 'GENERAL'
WHERE "category" NOT IN (
  'GENERAL', 'EXTERIOR_FACADE', 'WALLS_BASEBOARDS', 'FLOORS', 'STAIRS',
  'WINDOWS_JOINERY', 'KITCHEN', 'BATHROOM_SANITARY', 'LIVING_SPACES', 'LOGISTICS_ACCESS'
);