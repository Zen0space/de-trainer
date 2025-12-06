-- =============================================
-- ENABLE FOREIGN KEY CONSTRAINTS
-- =============================================
-- This ensures that foreign key constraints are enforced
-- and CASCADE deletes work properly

PRAGMA foreign_keys = ON;

-- =============================================
-- VERIFY CASCADE DELETE SETUP
-- =============================================
-- All tables that reference users should have ON DELETE CASCADE
-- This script verifies and recreates constraints if needed

-- Note: SQLite doesn't support ALTER TABLE to modify foreign keys
-- If constraints are missing, tables need to be recreated

-- =============================================
-- SAFE USER DELETION FUNCTION
-- =============================================
-- To safely delete a user and all related data, use:
-- DELETE FROM users WHERE id = ?;
-- 
-- This will automatically cascade delete from:
-- - trainers
-- - athletes  
-- - enrollments
-- - test_results
-- - athlete_body_metrics
-- - notifications
-- - workout_templates
-- - workout_assignments
-- - workout_session_progress (via workout_assignments)
-- - events
-- - event_participants
-- - event_reminders
-- - event_results

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Check all foreign key constraints
SELECT 
    m.name as table_name,
    p.*
FROM 
    sqlite_master m
    JOIN pragma_foreign_key_list(m.name) p
WHERE 
    m.type = 'table'
    AND p."table" = 'users'
ORDER BY 
    m.name;
