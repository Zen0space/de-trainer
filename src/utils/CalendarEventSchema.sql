-- =============================================
-- CALENDAR EVENT SYSTEM SCHEMA
-- =============================================
-- Database schema for calendar events, tournaments, and activities
-- Supports trainer-created events that are visible to assigned athletes
--
-- This schema enables:
-- - Creating various types of events (tournaments, competitions, training camps)
-- - Assigning specific athletes to events
-- - Event status tracking and management
-- - Calendar integration and scheduling
-- =============================================

-- =============================================
-- EVENT MANAGEMENT TABLES
-- =============================================

-- Event types for categorization
CREATE TABLE event_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3b82f6', -- Hex color for UI
    icon TEXT, -- Icon name for UI (e.g., 'trophy', 'calendar', 'flag')
    is_system BOOLEAN DEFAULT FALSE, -- System events cannot be deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main events table
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_type_id INTEGER NOT NULL,
    created_by_user_id INTEGER NOT NULL, -- Trainer who created the event
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    location TEXT,
    address TEXT,
    max_participants INTEGER,
    registration_deadline DATETIME,
    fee_amount REAL DEFAULT 0,
    fee_currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
    is_public BOOLEAN DEFAULT FALSE, -- Public events visible to all athletes
    requires_approval BOOLEAN DEFAULT FALSE, -- Athletes need approval to join
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_type_id) REFERENCES event_types (id),
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Event participants (athletes assigned to events)
CREATE TABLE event_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    athlete_id INTEGER NOT NULL,
    assigned_by_user_id INTEGER NOT NULL, -- Trainer who assigned the athlete
    status TEXT DEFAULT 'registered' CHECK (status IN ('invited', 'registered', 'confirmed', 'declined', 'attended', 'no_show', 'withdrawn')),
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_date DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(event_id, athlete_id) -- Prevent duplicate assignments
);

-- Event reminders/notifications
CREATE TABLE event_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL, -- Who will receive the reminder
    reminder_time DATETIME NOT NULL, -- When to send the reminder
    message TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Event results/performances (for competitions and tournaments)
CREATE TABLE event_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    athlete_id INTEGER NOT NULL,
    test_id INTEGER, -- Optional: link to fitness test if this is a competition
    result_value REAL,
    result_text TEXT,
    rank_position INTEGER,
    score REAL,
    notes TEXT,
    recorded_by_user_id INTEGER NOT NULL, -- Who recorded the result
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES tests (id),
    FOREIGN KEY (recorded_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================

-- Event management indexes
CREATE INDEX idx_events_creator ON events (created_by_user_id);
CREATE INDEX idx_events_type ON events (event_type_id);
CREATE INDEX idx_dates ON events (start_date, end_date);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_public ON events (is_public);
CREATE INDEX idx_events_location ON events (location);

-- Event participants indexes
CREATE INDEX idx_event_participants_event ON event_participants (event_id);
CREATE INDEX idx_event_participants_athlete ON event_participants (athlete_id);
CREATE INDEX idx_event_participants_assigned_by ON event_participants (assigned_by_user_id);
CREATE INDEX idx_event_participants_status ON event_participants (status);
CREATE INDEX idx_event_participants_registration ON event_participants (registration_date);

-- Event reminders indexes
CREATE INDEX idx_event_reminders_event ON event_reminders (event_id);
CREATE INDEX idx_event_reminders_user ON event_reminders (user_id);
CREATE INDEX idx_event_reminders_time ON event_reminders (reminder_time);
CREATE INDEX idx_event_reminders_sent ON event_reminders (is_sent);

-- Event results indexes
CREATE INDEX idx_event_results_event ON event_results (event_id);
CREATE INDEX idx_event_results_athlete ON event_results (athlete_id);
CREATE INDEX idx_event_results_rank ON event_results (rank_position);

-- =============================================
-- SAMPLE EVENT TYPES
-- =============================================

INSERT OR IGNORE INTO event_types (id, name, description, color, icon, is_system) VALUES
(1, 'Tournament', 'Competitive tournaments and championships', '#f59e0b', 'trophy', TRUE),
(2, 'Competition', 'Individual competitions and meets', '#ef4444', 'flag', TRUE),
(3, 'Training Camp', 'Intensive training sessions', '#10b981', 'calendar', TRUE),
(4, 'Workshop', 'Educational workshops and seminars', '#3b82f6', 'book-open', TRUE),
(5, 'Assessment', 'Performance assessments and evaluations', '#8b5cf6', 'clipboard', TRUE),
(6, 'Meeting', 'Team meetings and briefings', '#6b7280', 'users', TRUE),
(7, 'Recovery Session', 'Recovery and rehabilitation sessions', '#06b6d4', 'heart', TRUE);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for athlete calendar events
CREATE VIEW athlete_calendar_events AS
SELECT
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.location,
    e.address,
    e.status,
    et.name as event_type_name,
    et.color as event_type_color,
    et.icon as event_type_icon,
    ep.status as participation_status,
    ep.registration_date,
    u.full_name as created_by_name,
    CASE
        WHEN e.created_by_user_id = ep.athlete_id THEN 'owner'
        ELSE 'participant'
    END as role_in_event
FROM events e
JOIN event_types et ON e.event_type_id = et.id
JOIN event_participants ep ON e.id = ep.event_id
JOIN users u ON e.created_by_user_id = u.id
WHERE ep.athlete_id = ? -- Parameter: athlete_id
AND e.status IN ('upcoming', 'ongoing', 'completed')
ORDER BY e.start_date;

-- View for trainer created events
CREATE VIEW trainer_created_events AS
SELECT
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.location,
    e.address,
    e.status,
    e.max_participants,
    e.registration_deadline,
    e.is_public,
    et.name as event_type_name,
    et.color as event_type_color,
    et.icon as event_type_icon,
    COUNT(ep.id) as current_participants,
    COUNT(CASE WHEN ep.status = 'confirmed' THEN 1 END) as confirmed_participants
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN event_participants ep ON e.id = ep.event_id
WHERE e.created_by_user_id = ? -- Parameter: trainer_id
GROUP BY e.id, e.title, e.description, e.start_date, e.end_date, e.location,
         e.address, e.status, e.max_participants, e.registration_deadline,
         e.is_public, et.name, et.color, et.icon
ORDER BY e.start_date;

-- View for upcoming events (for notifications)
CREATE VIEW upcoming_events AS
SELECT
    e.id,
    e.title,
    e.start_date,
    e.location,
    u.full_name as athlete_name,
    u.email as athlete_email,
    et.name as event_type_name,
    ep.notes as participant_notes
FROM events e
JOIN event_participants ep ON e.id = ep.event_id
JOIN users u ON ep.athlete_id = u.id
JOIN event_types et ON e.event_type_id = et.id
WHERE e.status = 'upcoming'
AND e.start_date BETWEEN datetime('now') AND datetime('now', '+7 days')
AND ep.status IN ('registered', 'confirmed')
ORDER BY e.start_date;

-- =============================================
-- TRIGGERS FOR DATA INTEGRITY
-- =============================================

-- Update updated_at timestamp for events
CREATE TRIGGER update_events_updated_at
AFTER UPDATE ON events
FOR EACH ROW
BEGIN
    UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update updated_at timestamp for event participants
CREATE TRIGGER update_event_participants_updated_at
AFTER UPDATE ON event_participants
FOR EACH ROW
BEGIN
    UPDATE event_participants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update updated_at timestamp for event results
CREATE TRIGGER update_event_results_updated_at
AFTER UPDATE ON event_results
FOR EACH ROW
BEGIN
    UPDATE event_results SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Validate event dates (end_date must be after start_date)
CREATE TRIGGER validate_event_dates
BEFORE INSERT ON events
FOR EACH ROW
WHEN NEW.end_date <= NEW.start_date
BEGIN
    SELECT RAISE(ABORT, 'End date must be after start date');
END;

CREATE TRIGGER validate_event_dates_update
BEFORE UPDATE ON events
FOR EACH ROW
WHEN NEW.end_date <= NEW.start_date
BEGIN
    SELECT RAISE(ABORT, 'End date must be after start date');
END;

-- Validate registration deadline
CREATE TRIGGER validate_registration_deadline
BEFORE INSERT ON events
FOR EACH ROW
WHEN NEW.registration_deadline IS NOT NULL AND NEW.registration_deadline >= NEW.start_date
BEGIN
    SELECT RAISE(ABORT, 'Registration deadline must be before event start date');
END;

CREATE TRIGGER validate_registration_deadline_update
BEFORE UPDATE ON events
FOR EACH ROW
WHEN NEW.registration_deadline IS NOT NULL AND NEW.registration_deadline >= NEW.start_date
BEGIN
    SELECT RAISE(ABORT, 'Registration deadline must be before event start date');
END;

-- Ensure event creator has trainer role
CREATE TRIGGER validate_event_creator_role
BEFORE INSERT ON events
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = NEW.created_by_user_id
            AND u.role = 'trainer'
        ) THEN RAISE(ABORT, 'Only trainers can create events')
    END;
END;

-- Ensure event participants are athletes
CREATE TRIGGER validate_event_participant_role
BEFORE INSERT ON event_participants
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1 FROM users u
            JOIN athletes a ON u.id = a.user_id
            WHERE u.id = NEW.athlete_id
        ) THEN RAISE(ABORT, 'Event participants must be athletes')
    END;
END;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

/*
CALENDAR EVENT SYSTEM NOTES:

1. EVENT MANAGEMENT:
   - events: Main table storing all event information
   - event_types: Predefined categories with colors and icons
   - Supports both public and private events
   - Event status workflow: draft → upcoming → ongoing → completed/cancelled

2. PARTICIPANT MANAGEMENT:
   - event_participants: Links athletes to events
   - Status tracking: invited → registered → confirmed → attended/no_show
   - Trainers can assign athletes to events
   - Supports approval-based registration

3. NOTIFICATIONS:
   - event_reminders: Automated reminder system
   - Can send reminders to all participants or specific users
   - Tracks sent status and timestamps

4. COMPETITION RESULTS:
   - event_results: Store competition results and rankings
   - Links to fitness tests for standardized competitions
   - Supports both numeric and text-based results

5. ACCESS CONTROL:
   - Only trainers can create events
   - Only athletes can be event participants
   - Public events visible to all athletes
   - Private events require explicit assignment

6. CALENDAR INTEGRATION:
   - Comprehensive datetime support
   - Location and address fields
   - Registration deadlines
   - Participant limits and management

7. PERFORMANCE:
   - Optimized indexes for common queries
   - Views for athlete and trainer perspectives
   - Efficient date-based filtering

USAGE EXAMPLES:
- Create tournament: "Regional Championship" with specific date/location
- Assign athletes: Use event_participants table to invite specific athletes
- Track participation: Monitor status from invited to attended
- Record results: Store competition scores and rankings
- Send reminders: Schedule automatic notifications before events

The system supports the use case mentioned: "tournament [selected date] athlete [username]"
where a trainer creates a tournament event and assigns specific athletes to participate.
*/