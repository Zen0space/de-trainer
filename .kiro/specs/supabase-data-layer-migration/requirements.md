# Requirements Document

## Introduction

This document outlines the requirements for migrating the Jejak Atlet mobile application from Turso (SQLite) database to Supabase (PostgreSQL) using tRPC as the unified API layer. The migration focuses on athlete-facing features including profiles, enrollments, body metrics, test results, workouts, and calendar events. The existing authentication system (already using Supabase) will remain unchanged.

## Glossary

- **Mobile App**: React Native/Expo application used by athletes and trainers
- **Web Admin**: Next.js web application used by administrators to manage the database
- **tRPC Server**: Type-safe API layer hosted in the web package that handles all data operations
- **Supabase Client**: PostgreSQL database client used by tRPC procedures to access data
- **Turso Database**: Current SQLite-based database being migrated from
- **Migration Phase**: A discrete set of features migrated together as a unit
- **Authorization Context**: User identity and role information passed to tRPC procedures
- **RLS Policy**: Row Level Security policy in Supabase that provides database-level access control

## Requirements

### Requirement 1

**User Story:** As a developer, I want a unified tRPC API layer for all data access, so that both mobile and web applications use consistent, type-safe endpoints.

#### Acceptance Criteria

1. WHEN the mobile app requests data, THE tRPC Server SHALL process the request using the Supabase Client
2. WHEN the web admin requests data, THE tRPC Server SHALL process the request using the same procedures as mobile
3. WHEN a tRPC procedure executes, THE tRPC Server SHALL maintain full TypeScript type safety from database to client
4. WHEN the system initializes, THE tRPC Server SHALL use the existing Supabase configuration from environment variables
5. WHERE tRPC routers are organized, THE tRPC Server SHALL group procedures by feature domain (profiles, workouts, events, etc.)

### Requirement 2

**User Story:** As an athlete, I want my profile data migrated to Supabase, so that I can continue using the app without data loss.


#### Acceptance Criteria

1. WHEN an athlete views their profile, THE Mobile App SHALL retrieve profile data via tRPC from Supabase
2. WHEN an athlete updates their profile, THE tRPC Server SHALL persist changes to the Supabase users and user_profiling tables
3. WHEN profile data is migrated, THE tRPC Server SHALL preserve all existing user data including full_name, username, role, avatar_url, phone, address, and bio
4. WHEN an athlete uploads an avatar, THE tRPC Server SHALL store the image in Supabase Storage and update the avatar_url
5. WHERE athlete-specific data exists, THE tRPC Server SHALL migrate sport and level fields to the athletes table

### Requirement 3

**User Story:** As a trainer, I want my trainer profile and certification data migrated to Supabase, so that I can continue managing my athletes.

#### Acceptance Criteria

1. WHEN a trainer views their profile, THE Mobile App SHALL retrieve trainer data via tRPC from Supabase
2. WHEN a trainer updates their certification, THE tRPC Server SHALL update the trainers table with trainer_code, certification_id, and specialization
3. WHEN trainer verification status changes, THE tRPC Server SHALL update the verification_status field
4. WHERE trainer-specific data exists, THE tRPC Server SHALL maintain the unique trainer_code constraint
5. WHEN a trainer's profile is accessed, THE tRPC Server SHALL join users, user_profiling, and trainers tables to return complete profile data

### Requirement 4

**User Story:** As an athlete, I want to request enrollment with trainers, so that my trainer can track my progress.

#### Acceptance Criteria

1. WHEN an athlete requests enrollment, THE tRPC Server SHALL create a new enrollment record with status 'pending'
2. WHEN a trainer views enrollment requests, THE tRPC Server SHALL return all pending enrollments for that trainer
3. WHEN a trainer approves an enrollment, THE tRPC Server SHALL update the status to 'approved' and set responded_at timestamp
4. WHEN a trainer rejects an enrollment, THE tRPC Server SHALL update the status to 'rejected' and set responded_at timestamp
5. WHERE duplicate enrollments are attempted, THE tRPC Server SHALL prevent creation due to unique constraint on (athlete_id, trainer_id)

### Requirement 5

**User Story:** As an athlete, I want my body metrics tracked in Supabase, so that I can monitor my physical progress over time.

#### Acceptance Criteria

1. WHEN an athlete records body metrics, THE tRPC Server SHALL insert a new record in athlete_body_metrics table
2. WHEN an athlete views their metrics history, THE tRPC Server SHALL return all metrics ordered by measurement_date descending
3. WHEN body metrics are recorded, THE tRPC Server SHALL store weight, height, muscle_mass, body_fat_percentage, and bmi
4. WHEN an athlete updates existing metrics, THE tRPC Server SHALL update the record and set updated_at timestamp
5. WHERE metrics are queried, THE tRPC Server SHALL filter by athlete_id to ensure data isolation


### Requirement 6

**User Story:** As an athlete, I want my fitness test results migrated to Supabase, so that I can track my performance improvements.

#### Acceptance Criteria

1. WHEN an athlete records a test result, THE tRPC Server SHALL insert the result into test_results table with athlete_id, test_id, result_value, and test_date
2. WHEN test results are retrieved, THE tRPC Server SHALL join with tests and fitness_components tables to return complete test information
3. WHEN a new personal record is achieved, THE tRPC Server SHALL update is_best_record flag based on improvement_direction
4. WHEN an athlete views their test history, THE tRPC Server SHALL return results ordered by test_date descending
5. WHERE test results exist for multiple athletes, THE tRPC Server SHALL filter by athlete_id to ensure data isolation

### Requirement 7

**User Story:** As a trainer, I want to create workout templates in Supabase, so that I can assign workouts to my athletes.

#### Acceptance Criteria

1. WHEN a trainer creates a workout template, THE tRPC Server SHALL insert into workout_templates table with trainer_id, name, and description
2. WHEN a trainer adds exercises to a template, THE tRPC Server SHALL insert into workout_exercises table with order_index, sets, reps, and rest_time
3. WHEN a trainer assigns a workout, THE tRPC Server SHALL create a workout_assignment record linking template, athlete, and scheduled_date
4. WHEN workout templates are queried, THE tRPC Server SHALL include all associated workout_exercises ordered by order_index
5. WHERE a trainer manages templates, THE tRPC Server SHALL filter by trainer_id to show only their templates

### Requirement 8

**User Story:** As an athlete, I want to track my workout progress in Supabase, so that my trainer can monitor my completion.

#### Acceptance Criteria

1. WHEN an athlete starts a workout, THE tRPC Server SHALL update workout_assignment status to 'in_progress' and set started_at timestamp
2. WHEN an athlete completes a set, THE tRPC Server SHALL insert or update workout_session_progress with completed flag
3. WHEN an athlete finishes a workout, THE tRPC Server SHALL update workout_assignment status to 'completed' and set completed_at timestamp
4. WHEN a trainer views athlete progress, THE tRPC Server SHALL return workout_assignments with aggregated completion percentage
5. WHERE workout progress is tracked, THE tRPC Server SHALL ensure athlete_id matches the authenticated user

### Requirement 9

**User Story:** As a trainer, I want to create calendar events in Supabase, so that I can schedule competitions and training sessions for my athletes.

#### Acceptance Criteria

1. WHEN a trainer creates an event, THE tRPC Server SHALL insert into events table with title, event_type_id, start_date, end_date, and created_by_user_id
2. WHEN a trainer assigns athletes to an event, THE tRPC Server SHALL insert into event_participants table with event_id, athlete_id, and assigned_by_user_id
3. WHEN events are queried, THE tRPC Server SHALL join with event_types table to return event category and color
4. WHEN an athlete views their schedule, THE tRPC Server SHALL return events where they are a participant or where is_public is true
5. WHERE event participants are managed, THE tRPC Server SHALL prevent duplicate assignments via unique constraint on (event_id, athlete_id)


### Requirement 10

**User Story:** As an athlete, I want to receive notifications in Supabase, so that I stay informed about enrollment requests, workout assignments, and event updates.

#### Acceptance Criteria

1. WHEN a notification is created, THE tRPC Server SHALL insert into notifications table with user_id, type, title, message, and data
2. WHEN an athlete views notifications, THE tRPC Server SHALL return unread notifications ordered by created_at descending
3. WHEN an athlete marks a notification as read, THE tRPC Server SHALL update is_read to true and set read_at timestamp
4. WHEN notifications are queried, THE tRPC Server SHALL filter by user_id to ensure users only see their own notifications
5. WHERE notification data contains JSON, THE tRPC Server SHALL parse and validate the data field structure

### Requirement 11

**User Story:** As a system administrator, I want authorization checks in tRPC procedures, so that users can only access data they are permitted to see.

#### Acceptance Criteria

1. WHEN a tRPC procedure executes, THE tRPC Server SHALL verify the user is authenticated via Authorization Context
2. WHEN an athlete requests data, THE tRPC Server SHALL ensure the athlete_id matches the authenticated user's id
3. WHEN a trainer requests athlete data, THE tRPC Server SHALL verify an approved enrollment exists between trainer and athlete
4. WHEN an admin requests data, THE tRPC Server SHALL allow access to all records regardless of ownership
5. WHERE authorization fails, THE tRPC Server SHALL return an unauthorized error without exposing sensitive information

### Requirement 12

**User Story:** As a developer, I want Supabase RLS policies as a backup security layer, so that database access is protected even if application logic fails.

#### Acceptance Criteria

1. WHEN RLS policies are enabled, THE Supabase Client SHALL enforce row-level security on all tables
2. WHEN a user queries their own data, THE Supabase Client SHALL allow access based on auth.uid() matching user_id
3. WHEN a trainer queries athlete data, THE Supabase Client SHALL verify enrollment relationship via policy
4. WHEN public data is accessed, THE Supabase Client SHALL allow read access to fitness_components, tests, exercises, and event_types
5. WHERE RLS policies conflict with application logic, THE tRPC Server SHALL handle authorization at the application layer first

### Requirement 13

**User Story:** As a developer, I want a phased migration approach, so that features can be migrated incrementally without breaking the entire application.

#### Acceptance Criteria

1. WHEN Phase 1 executes, THE tRPC Server SHALL migrate user profiles, trainers, athletes, and enrollments
2. WHEN Phase 2 executes, THE tRPC Server SHALL migrate body metrics, fitness components, tests, and test results
3. WHEN Phase 3 executes, THE tRPC Server SHALL migrate workout templates, exercises, assignments, and progress tracking
4. WHEN Phase 4 executes, THE tRPC Server SHALL migrate calendar events, participants, reminders, and results
5. WHERE a phase is incomplete, THE Mobile App SHALL continue using Turso for unmigrated features


### Requirement 14

**User Story:** As a mobile app user, I want the app to gracefully handle migration errors, so that I can continue using available features even if some data operations fail.

#### Acceptance Criteria

1. WHEN a tRPC procedure fails, THE Mobile App SHALL display a user-friendly error message without exposing technical details
2. WHEN network connectivity is lost, THE Mobile App SHALL queue mutations for retry when connection is restored
3. WHEN Supabase is unavailable, THE tRPC Server SHALL return appropriate error codes and messages
4. WHEN data validation fails, THE tRPC Server SHALL return detailed validation errors to guide user correction
5. WHERE critical errors occur, THE Mobile App SHALL log errors for debugging while maintaining user experience

### Requirement 15

**User Story:** As a developer, I want comprehensive testing for migrated features, so that data integrity and functionality are verified before production deployment.

#### Acceptance Criteria

1. WHEN tRPC procedures are implemented, THE tRPC Server SHALL include unit tests for each procedure
2. WHEN authorization logic is added, THE tRPC Server SHALL include tests verifying access control rules
3. WHEN mobile screens are updated, THE Mobile App SHALL include integration tests for tRPC client calls
4. WHEN data migration occurs, THE tRPC Server SHALL verify data integrity by comparing record counts and key fields
5. WHERE edge cases exist, THE tRPC Server SHALL include tests for boundary conditions, null values, and error scenarios

### Requirement 16

**User Story:** As a developer, I want clear separation between tRPC routers by feature domain, so that the codebase remains maintainable as features grow.

#### Acceptance Criteria

1. WHEN tRPC routers are organized, THE tRPC Server SHALL create separate router files for profiles, enrollments, bodyMetrics, testResults, workouts, and events
2. WHEN routers are combined, THE tRPC Server SHALL merge all feature routers into a root router
3. WHEN procedures are named, THE tRPC Server SHALL use consistent naming conventions (e.g., getProfile, updateProfile, listWorkouts)
4. WHEN shared logic exists, THE tRPC Server SHALL extract common authorization and validation functions into utilities
5. WHERE router complexity grows, THE tRPC Server SHALL split large routers into sub-routers by sub-feature

### Requirement 17

**User Story:** As a developer, I want type-safe database queries using Supabase client, so that database operations are validated at compile time.

#### Acceptance Criteria

1. WHEN database queries are written, THE tRPC Server SHALL use Supabase TypeScript client with generated types
2. WHEN query results are returned, THE tRPC Server SHALL validate response types match expected schemas
3. WHEN mutations are performed, THE tRPC Server SHALL use parameterized queries to prevent SQL injection
4. WHEN complex joins are needed, THE tRPC Server SHALL use Supabase query builder methods for type safety
5. WHERE raw SQL is required, THE tRPC Server SHALL use typed query functions with explicit return types


### Requirement 18

**User Story:** As a web administrator, I want to use the same tRPC endpoints as mobile, so that I have consistent access to all application data.

#### Acceptance Criteria

1. WHEN the web admin queries data, THE Web Admin SHALL use tRPC client to call the same procedures as mobile
2. WHEN the web admin displays data, THE Web Admin SHALL receive the same typed responses as mobile
3. WHEN the web admin performs mutations, THE tRPC Server SHALL apply the same authorization rules as for mobile users
4. WHEN admin-specific features are needed, THE tRPC Server SHALL include admin-only procedures with role-based access control
5. WHERE admin views require aggregated data, THE tRPC Server SHALL provide specialized procedures for dashboard statistics

### Requirement 19

**User Story:** As a developer, I want to preserve existing Turso database during migration, so that rollback is possible if issues are discovered.

#### Acceptance Criteria

1. WHEN migration begins, THE tRPC Server SHALL maintain Turso database connections alongside Supabase
2. WHEN a feature is migrated, THE Mobile App SHALL switch to tRPC endpoints while keeping Turso code commented
3. WHEN issues are discovered, THE Mobile App SHALL be able to revert to Turso by uncommenting previous code
4. WHEN migration is complete and verified, THE tRPC Server SHALL remove Turso dependencies from the codebase
5. WHERE data discrepancies occur, THE tRPC Server SHALL provide comparison utilities to identify differences

### Requirement 20

**User Story:** As a developer, I want migration documentation, so that the team understands the new architecture and can maintain the system.

#### Acceptance Criteria

1. WHEN tRPC routers are created, THE tRPC Server SHALL include JSDoc comments explaining procedure purpose and parameters
2. WHEN authorization patterns are established, THE tRPC Server SHALL document the authorization strategy in code comments
3. WHEN migration phases complete, THE tRPC Server SHALL update README files with architecture diagrams and data flow
4. WHEN new procedures are added, THE tRPC Server SHALL follow established patterns documented in the codebase
5. WHERE complex business logic exists, THE tRPC Server SHALL include inline comments explaining the reasoning
