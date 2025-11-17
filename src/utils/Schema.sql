-- =============================================
-- JEJAK ATLET DATABASE SCHEMA
-- =============================================
-- Complete database schema for the Jejak Atlet fitness tracking application
-- Generated from existing Turso database structure
-- 
-- This schema supports:
-- - User management (trainers and athletes)
-- - Fitness component and test definitions
-- - Test result tracking and personal records
-- - Trainer-athlete enrollment relationships
-- - Notification system
-- =============================================

-- =============================================
-- CORE USER MANAGEMENT TABLES
-- =============================================

-- Main users table - stores all user accounts
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('trainer', 'athlete')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Extended trainer profiles
CREATE TABLE trainers (
    user_id INTEGER PRIMARY KEY,
    trainer_code TEXT NOT NULL UNIQUE,
    certification_id TEXT,
    specialization TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Extended athlete profiles
CREATE TABLE athletes (
    user_id INTEGER PRIMARY KEY,
    sport TEXT NOT NULL,
    level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'elite')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- =============================================
-- FITNESS FRAMEWORK TABLES
-- =============================================

-- Fitness components (e.g., Cardio Endurance, Muscular Strength)
CREATE TABLE fitness_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Specific fitness tests within components
CREATE TABLE tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    description TEXT,
    improvement_direction TEXT DEFAULT 'higher' CHECK (improvement_direction IN ('higher', 'lower')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES fitness_components (id) ON DELETE CASCADE,
    UNIQUE(component_id, name)
);

-- =============================================
-- RELATIONSHIP AND DATA TABLES
-- =============================================

-- Trainer-athlete enrollment relationships
CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    trainer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    notes TEXT,
    viewed_at DATETIME,
    accepting_at DATETIME,
    FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(athlete_id, trainer_id)
);

-- Test results and performance tracking
CREATE TABLE test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    result_value REAL,
    result_text TEXT,
    notes TEXT,
    test_date DATE NOT NULL,
    input_unit TEXT,
    is_best_record BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE
);

-- User notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT, -- JSON data for additional context
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- =============================================
-- WORKOUT MANAGEMENT TABLES
-- =============================================

-- Workout templates created by trainers (MVP - simplified)
CREATE TABLE workout_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Exercise library (MVP - system exercises only)
CREATE TABLE exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises within a workout template (MVP - simplified)
CREATE TABLE workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_template_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    rest_time INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
);

-- Workout assignments to athletes
CREATE TABLE workout_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_template_id INTEGER NOT NULL,
    athlete_id INTEGER NOT NULL,
    trainer_id INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'cancelled')),
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Athlete's progress through a workout session (MVP - simplified)
CREATE TABLE workout_session_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_assignment_id INTEGER NOT NULL,
    workout_exercise_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_assignment_id) REFERENCES workout_assignments (id) ON DELETE CASCADE,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================

-- User management indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_created_at ON users (created_at);

-- Trainer indexes
CREATE INDEX idx_trainers_code ON trainers (trainer_code);
CREATE INDEX idx_trainers_verification ON trainers (verification_status);

-- Athlete indexes
CREATE INDEX idx_athletes_sport ON athletes (sport);
CREATE INDEX idx_athletes_level ON athletes (level);

-- Fitness framework indexes
CREATE INDEX idx_tests_component ON tests (component_id);
CREATE INDEX idx_tests_name ON tests (name);

-- Enrollment indexes
CREATE INDEX idx_enrollments_athlete ON enrollments (athlete_id);
CREATE INDEX idx_enrollments_trainer ON enrollments (trainer_id);
CREATE INDEX idx_enrollments_status ON enrollments (status);
CREATE INDEX idx_enrollments_requested_at ON enrollments (requested_at);

-- Test results indexes (critical for performance)
CREATE INDEX idx_test_results_athlete ON test_results (athlete_id);
CREATE INDEX idx_test_results_test ON test_results (test_id);
CREATE INDEX idx_test_results_date ON test_results (test_date);
CREATE INDEX idx_test_results_athlete_test ON test_results (athlete_id, test_id);
CREATE INDEX idx_test_results_best_record ON test_results (is_best_record) WHERE is_best_record = TRUE;
CREATE INDEX idx_test_results_created_at ON test_results (created_at);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_read ON notifications (is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);

-- Workout indexes
CREATE INDEX idx_workout_templates_trainer ON workout_templates (trainer_id);
CREATE INDEX idx_exercises_muscle_group ON exercises (muscle_group);
CREATE INDEX idx_workout_exercises_template ON workout_exercises (workout_template_id);
CREATE INDEX idx_workout_exercises_order ON workout_exercises (workout_template_id, order_index);
CREATE INDEX idx_workout_assignments_athlete ON workout_assignments (athlete_id);
CREATE INDEX idx_workout_assignments_trainer ON workout_assignments (trainer_id);
CREATE INDEX idx_workout_assignments_status ON workout_assignments (status);
CREATE INDEX idx_workout_assignments_date ON workout_assignments (scheduled_date);
CREATE INDEX idx_workout_session_progress_assignment ON workout_session_progress (workout_assignment_id);

-- =============================================
-- SAMPLE FITNESS COMPONENTS AND TESTS
-- =============================================
-- These are commonly used in fitness assessments

INSERT OR IGNORE INTO fitness_components (id, name, description) VALUES
(1, 'Cardio Endurance', 'Cardiovascular endurance and aerobic capacity'),
(2, 'Muscular Strength', 'Maximum force production capability'),
(3, 'Muscular Endurance', 'Ability to sustain muscle contractions over time'),
(4, 'Flexibility', 'Range of motion around joints'),
(5, 'Power', 'Explosive strength and speed combination'),
(6, 'Speed', 'Ability to move quickly'),
(7, 'Agility', 'Ability to change direction quickly'),
(8, 'Balance', 'Ability to maintain equilibrium'),
(9, 'Body Composition', 'Ratio of fat to lean body mass');

INSERT OR IGNORE INTO tests (component_id, name, unit, description, improvement_direction) VALUES
-- Cardio Endurance Tests
(1, 'Beep Test', 'level', 'Progressive shuttle run test', 'higher'),
(1, '2.4km Run', 'minutes', '2.4 kilometer run time test', 'lower'),
(1, '12 Minute Cooper Test', 'meters', 'Distance covered in 12 minutes', 'higher'),
(1, 'VO2 Max Test', 'ml/kg/min', 'Maximum oxygen consumption test', 'higher'),

-- Muscular Strength Tests
(2, '1RM Bench Press', 'kg', 'One repetition maximum bench press', 'higher'),
(2, '1RM Squat', 'kg', 'One repetition maximum squat', 'higher'),
(2, '1RM Deadlift', 'kg', 'One repetition maximum deadlift', 'higher'),
(2, 'Handgrip Strength', 'kg', 'Maximum grip strength test', 'higher'),

-- Muscular Endurance Tests
(3, 'Push-ups', 'reps', 'Maximum push-ups in 60 seconds', 'higher'),
(3, 'Sit-ups', 'reps', 'Maximum sit-ups in 60 seconds', 'higher'),
(3, 'Plank Hold', 'seconds', 'Maximum plank hold time', 'higher'),
(3, 'Pull-ups', 'reps', 'Maximum pull-ups without rest', 'higher'),

-- Flexibility Tests
(4, 'Sit and Reach', 'cm', 'Forward flexibility test', 'higher'),
(4, 'Shoulder Flexibility', 'cm', 'Shoulder range of motion test', 'higher'),

-- Power Tests
(5, 'Vertical Jump', 'cm', 'Maximum vertical jump height', 'higher'),
(5, 'Standing Long Jump', 'cm', 'Maximum horizontal jump distance', 'higher'),
(5, 'Medicine Ball Throw', 'meters', '2kg medicine ball throw distance', 'higher'),

-- Speed Tests
(6, '40m Sprint', 'seconds', '40 meter sprint time', 'lower'),
(6, '100m Sprint', 'seconds', '100 meter sprint time', 'lower'),

-- Agility Tests
(7, 'T-Test', 'seconds', 'T-shaped agility course time', 'lower'),
(7, '5-10-5 Shuttle', 'seconds', 'Pro agility shuttle run time', 'lower'),

-- Balance Tests
(8, 'Single Leg Stand', 'seconds', 'Single leg balance with eyes closed', 'higher'),
(8, 'Y-Balance Test', 'cm', 'Dynamic balance reach test', 'higher'),

-- Body Composition Tests
(9, 'Body Fat Percentage', '%', 'Percentage of body fat', 'lower'),
(9, 'BMI', 'kg/m²', 'Body Mass Index calculation', 'lower');

-- =============================================
-- SAMPLE EXERCISES FOR WORKOUT SYSTEM
-- =============================================

INSERT OR IGNORE INTO exercises (name, muscle_group) VALUES
-- Chest exercises
('Barbell Bench Press', 'chest'),
('Dumbbell Bench Press', 'chest'),
('Push-ups', 'chest'),
('Incline Dumbbell Press', 'chest'),
('Cable Chest Fly', 'chest'),

-- Back exercises
('Pull-ups', 'back'),
('Barbell Rows', 'back'),
('Lat Pulldown', 'back'),
('Dumbbell Rows', 'back'),
('Deadlift', 'back'),

-- Legs exercises
('Barbell Squat', 'legs'),
('Leg Press', 'legs'),
('Lunges', 'legs'),
('Romanian Deadlift', 'legs'),
('Leg Curl', 'legs'),
('Calf Raises', 'legs'),

-- Shoulders exercises
('Overhead Press', 'shoulders'),
('Dumbbell Shoulder Press', 'shoulders'),
('Lateral Raises', 'shoulders'),
('Front Raises', 'shoulders'),
('Face Pulls', 'shoulders'),

-- Arms exercises
('Barbell Curl', 'arms'),
('Dumbbell Curl', 'arms'),
('Tricep Dips', 'arms'),
('Tricep Pushdown', 'arms'),
('Hammer Curls', 'arms'),

-- Core exercises
('Plank', 'core'),
('Crunches', 'core'),
('Russian Twists', 'core'),
('Leg Raises', 'core'),
('Mountain Climbers', 'core');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for trainer dashboard statistics
CREATE VIEW trainer_dashboard_stats AS
SELECT 
    t.user_id as trainer_id,
    u.full_name as trainer_name,
    COUNT(DISTINCT e.athlete_id) as total_athletes,
    COUNT(DISTINCT CASE 
        WHEN tr.test_date >= date('now', '-7 days') 
        THEN tr.athlete_id 
    END) as active_athletes_week,
    COUNT(tr.id) as total_test_results,
    COUNT(CASE WHEN tr.is_best_record = TRUE THEN 1 END) as total_personal_records
FROM users u
JOIN trainers t ON u.id = t.user_id
LEFT JOIN enrollments e ON t.user_id = e.trainer_id AND e.status = 'approved'
LEFT JOIN test_results tr ON e.athlete_id = tr.athlete_id
WHERE u.role = 'trainer'
GROUP BY t.user_id, u.full_name;

-- View for athlete progress tracking
CREATE VIEW athlete_progress AS
SELECT 
    tr.athlete_id,
    u.full_name as athlete_name,
    fc.name as fitness_component,
    t.name as test_name,
    t.unit,
    t.improvement_direction,
    tr.result_value,
    tr.test_date,
    tr.is_best_record,
    ROW_NUMBER() OVER (
        PARTITION BY tr.athlete_id, tr.test_id 
        ORDER BY tr.test_date DESC
    ) as recent_rank
FROM test_results tr
JOIN users u ON tr.athlete_id = u.id
JOIN tests t ON tr.test_id = t.id
JOIN fitness_components fc ON t.component_id = fc.id
ORDER BY tr.athlete_id, tr.test_date DESC;

-- =============================================
-- TRIGGERS FOR DATA INTEGRITY
-- =============================================

-- Automatically update best record flags when new test results are inserted
CREATE TRIGGER update_best_records
AFTER INSERT ON test_results
FOR EACH ROW
BEGIN
    -- Reset all best records for this athlete/test combination
    UPDATE test_results 
    SET is_best_record = FALSE 
    WHERE athlete_id = NEW.athlete_id AND test_id = NEW.test_id;
    
    -- Set the best record based on improvement direction
    UPDATE test_results 
    SET is_best_record = TRUE 
    WHERE athlete_id = NEW.athlete_id 
    AND test_id = NEW.test_id
    AND id = (
        SELECT tr.id
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.athlete_id = NEW.athlete_id 
        AND tr.test_id = NEW.test_id
        AND tr.result_value IS NOT NULL
        ORDER BY 
            CASE 
                WHEN t.improvement_direction = 'higher' THEN tr.result_value 
                ELSE -tr.result_value 
            END DESC
        LIMIT 1
    );
END;

-- =============================================
-- SECURITY AND CONSTRAINTS
-- =============================================

-- Ensure users can only have one role-specific profile
CREATE TRIGGER enforce_single_profile
BEFORE INSERT ON trainers
FOR EACH ROW
WHEN EXISTS (SELECT 1 FROM athletes WHERE user_id = NEW.user_id)
BEGIN
    SELECT RAISE(ABORT, 'User already has an athlete profile');
END;

CREATE TRIGGER enforce_single_profile_athletes
BEFORE INSERT ON athletes
FOR EACH ROW
WHEN EXISTS (SELECT 1 FROM trainers WHERE user_id = NEW.user_id)
BEGIN
    SELECT RAISE(ABORT, 'User already has a trainer profile');
END;

-- Ensure enrollment participants have correct roles
CREATE TRIGGER validate_enrollment_roles
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
    -- Check that athlete_id is actually an athlete
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM users u 
            JOIN athletes a ON u.id = a.user_id 
            WHERE u.id = NEW.athlete_id
        ) THEN RAISE(ABORT, 'athlete_id must reference a user with athlete role')
    END;
    
    -- Check that trainer_id is actually a trainer
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM users u 
            JOIN trainers t ON u.id = t.user_id 
            WHERE u.id = NEW.trainer_id
        ) THEN RAISE(ABORT, 'trainer_id must reference a user with trainer role')
    END;
END;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

/*
DATABASE SCHEMA NOTES:

1. USER MANAGEMENT:
   - users: Base table for all accounts
   - trainers/athletes: Extended profiles with role-specific data
   - Enforced 1:1 relationship between users and their role profile

2. FITNESS FRAMEWORK:
   - fitness_components: Categories like "Cardio Endurance"
   - tests: Specific tests within each component
   - improvement_direction: 'higher' = more is better, 'lower' = less is better

3. RELATIONSHIPS:
   - enrollments: Many-to-many between trainers and athletes
   - Status tracking: pending → approved/rejected workflow

4. PERFORMANCE DATA:
   - test_results: Individual test performances
   - is_best_record: Automatically maintained by triggers
   - Supports both numeric (result_value) and text (result_text) results

5. NOTIFICATIONS:
   - Generic notification system
   - data field stores JSON for flexible context

6. PERFORMANCE OPTIMIZATIONS:
   - Comprehensive indexing strategy
   - Views for common dashboard queries
   - Triggers for automatic best record maintenance

7. DATA INTEGRITY:
   - Foreign key constraints with CASCADE deletes
   - CHECK constraints for enum-like values
   - Triggers prevent invalid role assignments

USAGE PATTERNS:
- Trainers manage multiple athletes through enrollments
- Athletes perform tests and track personal records
- Dashboard queries use indexed views for performance
- Notifications keep users informed of system events
*/
