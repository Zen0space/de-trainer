# Implementation Plan

- [x] 1. Set up tRPC infrastructure and shared types
  - Create Supabase client utilities for tRPC server
  - Set up tRPC context with authentication
  - Create authorization middleware (protectedProcedure, trainerProcedure, athleteProcedure)
  - Create shared TypeScript types in packages/shared
  - _Requirements: 1.1, 1.3, 1.4, 11.1_

- [ ]* 1.1 Write unit tests for authorization middleware
  - Test protectedProcedure rejects unauthenticated requests
  - Test trainerProcedure rejects non-trainers
  - Test athleteProcedure rejects non-athletes
  - _Requirements: 11.1, 11.2_

- [x] 2. Phase 1: Migrate user profiles and enrollments
  - _Requirements: 2.1-2.5, 3.1-3.5, 4.1-4.5, 13.1_

- [x] 2.1 Create profiles tRPC router
  - Implement getProfile procedure (joins users, user_profiling, trainers/athletes)
  - Implement updateProfile procedure with authorization
  - Implement uploadAvatar procedure with Supabase Storage
  - Implement getTrainerByCode procedure
  - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2_

- [ ]* 2.2 Write property test for profile update persistence
  - **Property 2: Profile update persistence**
  - **Validates: Requirements 2.2, 3.2**

- [ ]* 2.3 Write property test for profile retrieval completeness
  - **Property 1: Profile retrieval completeness**
  - **Validates: Requirements 2.1, 3.1, 3.5**

- [ ]* 2.4 Write property test for avatar upload round-trip
  - **Property 3: Avatar upload round-trip**
  - **Validates: Requirements 2.4**

- [ ]* 2.5 Write property test for trainer code uniqueness
  - **Property 5: Trainer code uniqueness**
  - **Validates: Requirements 3.4**

- [x] 2.6 Create enrollments tRPC router
  - Implement requestEnrollment procedure (athlete)
  - Implement listPendingRequests procedure (trainer)
  - Implement respondToEnrollment procedure (trainer)
  - Implement listMyAthletes procedure (trainer)
  - Implement listMyTrainers procedure (athlete)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 2.7 Write property test for enrollment creation
  - **Property 6: Enrollment creation with pending status**
  - **Validates: Requirements 4.1**

- [ ]* 2.8 Write property test for enrollment filtering
  - **Property 7: Enrollment filtering by trainer**
  - **Validates: Requirements 4.2**

- [ ]* 2.9 Write property test for enrollment status updates
  - **Property 8: Enrollment status update with timestamp**
  - **Validates: Requirements 4.3, 4.4**

- [ ]* 2.10 Write property test for enrollment uniqueness
  - **Property 9: Enrollment uniqueness constraint**
  - **Validates: Requirements 4.5**

- [x] 2.11 Update mobile athlete profile screens to use tRPC
  - Update AthleteProfileScreen to use trpc.profiles.getProfile
  - Update profile edit functionality to use trpc.profiles.updateProfile
  - Update avatar upload to use trpc.profiles.uploadAvatar
  - Add error handling with user-friendly messages
  - _Requirements: 2.1, 2.2, 2.4, 14.1_

- [x] 2.12 Update mobile trainer profile screens to use tRPC
  - Update ProfileScreen to use trpc.profiles.getProfile
  - Update trainer-specific fields (certification, specialization)
  - Add error handling
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.13 Update mobile enrollment screens to use tRPC
  - Update TrainerConnectionScreen to use trpc.enrollments.requestEnrollment
  - Update ManageAthletesScreen to use trpc.enrollments.listPendingRequests
  - Update enrollment response functionality
  - Add error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.14 Run migration script for Phase 1 data
  - Migrate users table data
  - Migrate user_profiling table data
  - Migrate trainers and athletes table data
  - Migrate enrollments table data
  - Verify data integrity
  - _Requirements: 2.3, 2.5, 13.1_

- [ ]* 2.15 Write property test for migration data preservation
  - **Property 4: Migration data preservation**
  - **Validates: Requirements 2.3, 2.5, 13.1**

- [x] 3. Checkpoint - Verify Phase 1 completion
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Phase 2: Migrate body metrics and test results
  - _Requirements: 5.1-5.5, 6.1-6.5, 13.2_

- [x] 4.1 Create bodyMetrics tRPC router
  - Implement recordMetrics procedure (athlete)
  - Implement getMyMetrics procedure (athlete) with ordering
  - Implement updateMetrics procedure (athlete)
  - Implement getAthleteMetrics procedure (trainer) with enrollment verification
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 4.2 Write property test for body metrics recording
  - **Property 10: Body metrics recording**
  - **Validates: Requirements 5.1, 5.3**

- [ ]* 4.3 Write property test for metrics history ordering
  - **Property 11: Metrics history ordering**
  - **Validates: Requirements 5.2**

- [ ]* 4.4 Write property test for metrics update with timestamp
  - **Property 12: Metrics update with timestamp**
  - **Validates: Requirements 5.4**

- [ ]* 4.5 Write property test for data isolation
  - **Property 13: Data isolation by athlete**
  - **Validates: Requirements 5.5, 6.5, 10.4**

- [x] 4.6 Create testResults tRPC router
  - Implement recordTestResult procedure (athlete)
  - Implement getMyTestResults procedure (athlete) with ordering
  - Implement getAthleteTestResults procedure (trainer)
  - Implement getFitnessComponents procedure (public)
  - Implement getTestsByComponent procedure (public)
  - Add personal record detection logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 4.7 Write property test for test result recording
  - **Property 14: Test result recording with complete information**
  - **Validates: Requirements 6.1, 6.2**

- [ ]* 4.8 Write property test for personal record detection
  - **Property 15: Personal record detection**
  - **Validates: Requirements 6.3**

- [ ]* 4.9 Write property test for test results ordering
  - **Property 16: Test results ordering**
  - **Validates: Requirements 6.4**

- [x] 4.10 Update mobile body metrics screens to use tRPC
  - Update BodyMetricsTab to use trpc.bodyMetrics.getMyMetrics
  - Update BodyMetricModal to use trpc.bodyMetrics.recordMetrics
  - Update AthleteBodyMetricsStats component
  - Add error handling
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 4.11 Update mobile test results screens to use tRPC
  - Update AthleteProgressScreen to use trpc.testResults.getMyTestResults
  - Update test result recording functionality
  - Display personal records with is_best_record flag
  - Add error handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.12 Run migration script for Phase 2 data
  - Migrate athlete_body_metrics table data
  - Migrate fitness_components table data
  - Migrate tests table data
  - Migrate test_results table data
  - Verify data integrity and personal record flags
  - _Requirements: 13.2_

- [ ]* 4.13 Write property test for Phase 2 migration
  - **Property 4: Migration data preservation (Phase 2)**
  - **Validates: Requirements 13.2**

- [x] 5. Checkpoint - Verify Phase 2 completion
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Phase 3: Migrate workout management
  - _Requirements: 7.1-7.5, 8.1-8.5, 13.3_

- [x] 6.1 Create workouts tRPC router
  - Implement createTemplate procedure (trainer)
  - Implement listMyTemplates procedure (trainer)
  - Implement updateTemplate procedure (trainer)
  - Implement deleteTemplate procedure (trainer)
  - Implement assignWorkout procedure (trainer)
  - Implement getExercises procedure (public)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 6.2 Write property test for workout template creation
  - **Property 17: Workout template creation with exercises**
  - **Validates: Requirements 7.1, 7.2**

- [ ]* 6.3 Write property test for workout assignment
  - **Property 18: Workout assignment creation**
  - **Validates: Requirements 7.3**

- [ ]* 6.4 Write property test for template exercises ordering
  - **Property 19: Template exercises ordering**
  - **Validates: Requirements 7.4**

- [ ]* 6.5 Write property test for template filtering
  - **Property 20: Template filtering by trainer**
  - **Validates: Requirements 7.5**

- [x] 6.6 Add workout progress procedures to workouts router
  - Implement getMyWorkouts procedure (athlete)
  - Implement getWorkoutDetail procedure (athlete)
  - Implement startWorkout procedure (athlete)
  - Implement updateProgress procedure (athlete)
  - Implement finishWorkout procedure (athlete)
  - Implement getAthleteWorkouts procedure (trainer)
  - Add completion percentage calculation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 6.7 Write property test for workout status transitions
  - **Property 21: Workout status transitions with timestamps**
  - **Validates: Requirements 8.1, 8.3**

- [ ]* 6.8 Write property test for workout progress tracking
  - **Property 22: Workout progress tracking**
  - **Validates: Requirements 8.2**

- [ ]* 6.9 Write property test for completion percentage
  - **Property 23: Workout completion percentage calculation**
  - **Validates: Requirements 8.4**

- [ ]* 6.10 Write property test for workout progress authorization
  - **Property 24: Workout progress authorization**
  - **Validates: Requirements 8.5**

- [x] 6.11 Update mobile trainer workout screens to use tRPC
  - Update WorkoutBuilderScreen to use trpc.workouts.createTemplate
  - Update template listing and management
  - Update workout assignment functionality
  - Add error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 6.12 Update mobile athlete workout screens to use tRPC
  - Update WorkoutListScreen to use trpc.workouts.getMyWorkouts
  - Update WorkoutDetailScreen to use trpc.workouts.getWorkoutDetail
  - Update WorkoutExecutionScreen to use progress procedures
  - Update WorkoutHistoryScreen
  - Add error handling
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6.13 Run migration script for Phase 3 data
  - Migrate workout_templates table data
  - Migrate exercises table data
  - Migrate workout_exercises table data
  - Migrate workout_assignments table data
  - Migrate workout_session_progress table data
  - Verify data integrity
  - _Requirements: 13.3_

- [ ]* 6.14 Write property test for Phase 3 migration
  - **Property 4: Migration data preservation (Phase 3)**
  - **Validates: Requirements 13.3**

- [x] 7. Checkpoint - Verify Phase 3 completion
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Phase 4: Migrate calendar events and notifications
  - _Requirements: 9.1-9.5, 10.1-10.5, 13.4_

- [x] 8.1 Create events tRPC router
  - Implement createEvent procedure (trainer)
  - Implement listMyEvents procedure (trainer)
  - Implement updateEvent procedure (trainer)
  - Implement deleteEvent procedure (trainer)
  - Implement assignAthletes procedure (trainer)
  - Implement getMySchedule procedure (athlete)
  - Implement getEventTypes procedure (public)
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 8.2 Write property test for event creation
  - **Property 25: Event creation with type information**
  - **Validates: Requirements 9.1, 9.3**

- [ ]* 8.3 Write property test for event participant assignment
  - **Property 26: Event participant assignment**
  - **Validates: Requirements 9.2**

- [ ]* 8.4 Write property test for athlete schedule filtering
  - **Property 27: Athlete schedule filtering**
  - **Validates: Requirements 9.4**

- [ ]* 8.5 Write property test for event participant uniqueness
  - **Property 9: Enrollment uniqueness constraint (applies to events)**
  - **Validates: Requirements 9.5**

- [x] 8.6 Create notifications tRPC router
  - Implement createNotification procedure (system/trainer)
  - Implement getMyNotifications procedure (all users)
  - Implement markAsRead procedure (all users)
  - Implement markAllAsRead procedure (all users)
  - Add JSON validation for notification data
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 8.7 Write property test for notification creation
  - **Property 28: Notification creation and retrieval**
  - **Validates: Requirements 10.1, 10.2**

- [ ]* 8.8 Write property test for notification ordering
  - **Property 29: Notification ordering**
  - **Validates: Requirements 10.2**

- [ ]* 8.9 Write property test for notification mark as read
  - **Property 30: Notification mark as read**
  - **Validates: Requirements 10.3**

- [ ]* 8.10 Write property test for notification JSON validation
  - **Property 31: Notification JSON validation**
  - **Validates: Requirements 10.5**

- [x] 8.11 Update mobile schedule screens to use tRPC
  - Update AthleteScheduleScreen to use trpc.events.getMySchedule
  - Update TrainerScheduleScreen to use trpc.events.listMyEvents
  - Update CreateEventModal to use trpc.events.createEvent
  - Update event assignment functionality
  - Add error handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 8.12 Add notification system to mobile app
  - Create notification badge component
  - Update screens to use trpc.notifications.getMyNotifications
  - Add mark as read functionality
  - Add notification center screen
  - Add error handling
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 8.13 Run migration script for Phase 4 data
  - Migrate event_types table data
  - Migrate events table data
  - Migrate event_participants table data
  - Migrate event_reminders table data
  - Migrate event_results table data
  - Migrate notifications table data
  - Verify data integrity
  - _Requirements: 13.4_

- [ ]* 8.14 Write property test for Phase 4 migration
  - **Property 4: Migration data preservation (Phase 4)**
  - **Validates: Requirements 13.4**

- [ ] 9. Checkpoint - Verify Phase 4 completion
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Add authorization property tests
  - _Requirements: 11.1-11.5_

- [ ]* 10.1 Write property test for authentication verification
  - **Property 32: Authentication verification**
  - **Validates: Requirements 11.1**

- [ ]* 10.2 Write property test for athlete data authorization
  - **Property 33: Athlete data authorization**
  - **Validates: Requirements 11.2**

- [ ]* 10.3 Write property test for trainer-athlete enrollment verification
  - **Property 34: Trainer-athlete enrollment verification**
  - **Validates: Requirements 11.3**

- [ ]* 10.4 Write property test for admin access privileges
  - **Property 35: Admin access privileges**
  - **Validates: Requirements 11.4**

- [ ]* 10.5 Write property test for authorization error handling
  - **Property 36: Authorization error handling**
  - **Validates: Requirements 11.5**

- [ ] 11. Add error handling property tests
  - _Requirements: 14.3, 14.4_

- [ ]* 11.1 Write property test for error code consistency
  - **Property 37: Error code consistency**
  - **Validates: Requirements 14.3, 14.4**

- [ ] 12. Create web admin dashboard using tRPC
  - Create admin layout with navigation
  - Create users management page using trpc.profiles
  - Create enrollments management page using trpc.enrollments
  - Create workouts overview page using trpc.workouts
  - Create events calendar page using trpc.events
  - Add admin-specific procedures if needed
  - _Requirements: 18.1, 18.2, 18.3_

- [ ] 13. Integration testing
  - _Requirements: 15.3_

- [ ]* 13.1 Write integration test for enrollment flow
  - Test athlete request → trainer approve → data access
  - _Requirements: 4.1, 4.2, 4.3, 11.3_

- [ ]* 13.2 Write integration test for workout assignment flow
  - Test trainer create template → assign → athlete complete
  - _Requirements: 7.1, 7.3, 8.1, 8.2, 8.3_

- [ ]* 13.3 Write integration test for event creation flow
  - Test trainer create event → assign athletes → athlete view schedule
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 14. Final cleanup and documentation
  - Remove Turso database dependencies from codebase
  - Update README with new architecture
  - Add API documentation for tRPC routers
  - Create migration runbook
  - _Requirements: 19.4, 20.1, 20.2, 20.3_

- [ ] 15. Final checkpoint - Complete migration verification
  - Ensure all tests pass, ask the user if questions arise.
