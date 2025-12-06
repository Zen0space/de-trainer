# Implementation Plan

## Core MVP Features (Required)

- [x] 1. Set up simplified database schema
  - Database schema has been created in src/utils/Schema.sql with all required tables
  - workout_templates, exercises, workout_exercises, workout_assignments, workout_session_progress tables exist
  - Indexes and sample exercises have been added
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 2. Create data access layer for workouts
  - All workout-related CRUD operations have been implemented in offline-api.ts
  - Includes template management, exercise library, assignments, and progress tracking
  - All functions follow offline-first pattern with dirty flags and background sync
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 7.5, 8.1, 8.3, 8.4_

- [x] 3. Build simplified workout creation UI for trainers
  - WorkoutBuilderScreen component exists with all required functionality
  - ExerciseLibraryModal and ExerciseConfigModal components are implemented
  - All components follow responsive design patterns
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2_

- [x] 4. Build workout assignment UI for trainers
  - WorkoutAssignmentModal component is implemented
  - WorkoutTemplateLibrary component exists with search and delete functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.5_

- [x] 5. Build workout viewing UI for athletes
  - WorkoutListScreen and WorkoutDetailScreen components are implemented
  - Includes tab navigation, pull-to-refresh, and empty states
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2_

- [x] 6. Build workout execution UI for athletes
  - WorkoutExecutionScreen component is implemented
  - RestTimer component exists with countdown functionality
  - Progress tracking is integrated
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 9.3, 9.4_

- [x] 7. Build workout progress monitoring UI for trainers
  - WorkoutProgressDashboard component is implemented
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 8. Implement basic workout modification
  - Reschedule and cancel functions are implemented in offline-api.ts
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 9. Implement validation and error handling
  - All validation is implemented in offline-api.ts functions
  - Error messages and toast notifications are integrated
  - _Requirements: 1.4, 3.1, 3.2, 3.3, 9.1, 9.2, 9.3, 9.4_

- [ ] 10. Implement offline support and synchronization
  - [ ] 10.1 Add workout tables to sync service
    - Add 'workout_templates', 'exercises', 'workout_exercises', 'workout_assignments', 'workout_session_progress' to SYNC_TABLES array in sync-service.ts
    - Add primary key mappings for workout tables to TABLE_PRIMARY_KEYS object
    - Ensure sync order respects foreign key dependencies (templates before exercises, exercises before assignments, assignments before progress)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 10.2 Test offline workout functionality
    - Verify workouts can be created offline and sync when online
    - Test workout completion offline with proper sync
    - Verify conflict resolution works correctly
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 11. Add navigation integration
  - [ ] 11.1 Integrate WorkoutBuilderScreen into TrainerHomeScreen
    - Add "Create Workout" quick action button to TrainerHomeScreen
    - Implement navigation state to show WorkoutBuilderScreen when button is pressed
    - Add back navigation from WorkoutBuilderScreen to TrainerHomeScreen
    - _Requirements: 1.1_
  
  - [ ] 11.2 Integrate WorkoutProgressDashboard into TrainerHomeScreen
    - Add "View Workout Progress" or "Workouts" navigation option to TrainerHomeScreen
    - Implement navigation state to show WorkoutProgressDashboard
    - Display recent workout completion stats in TrainerHomeScreen dashboard
    - _Requirements: 6.1, 6.5_
  
  - [ ] 11.3 Integrate workout screens into AthleteHomeScreen
    - Add "Workouts" tab or button to AthleteHomeScreen navigation
    - Implement navigation state to show WorkoutListScreen
    - Wire up navigation from WorkoutListScreen → WorkoutDetailScreen → WorkoutExecutionScreen
    - Add back navigation between all athlete workout screens
    - _Requirements: 4.1_
  
  - [ ] 11.4 Add WorkoutHistoryScreen integration
    - Integrate WorkoutHistoryScreen into athlete navigation flow
    - Display completed workouts with dates and completion status
    - _Requirements: 4.1, 9.1, 9.2_

## Future Enhancements (Optional - Not in MVP)

- [ ]* 13. Advanced workout features
  - [ ]* 13.1 Add difficulty level and estimated duration to workouts
    - Add difficulty_level field (beginner, intermediate, advanced)
    - Add estimated_duration field in minutes
    - Update UI to display and filter by difficulty
    - _Future enhancement for better workout categorization_
  
  - [ ]* 13.2 Add weight, duration, and distance tracking
    - Add weight field to workout_exercises (kg)
    - Add duration field for time-based exercises (seconds)
    - Add distance field for cardio exercises (meters)
    - Update ExerciseConfigModal to support these fields
    - _Future enhancement for more detailed exercise tracking_
  
  - [ ]* 13.3 Implement superset and circuit grouping
    - Add group_id and group_type fields to workout_exercises
    - Create grouping UI in WorkoutBuilderScreen
    - Add visual indicators for grouped exercises
    - Update execution screen to handle grouped exercises
    - _Future enhancement for advanced programming_

- [ ]* 14. Custom exercise creation
  - [ ]* 14.1 Create CustomExerciseModal component
    - Add exercise name input field
    - Add description textarea
    - Add muscle group dropdown
    - Add equipment dropdown
    - Implement save custom exercise functionality
    - _Future enhancement for trainer flexibility_
  
  - [ ]* 14.2 Add equipment field to exercises
    - Add equipment field to exercises table
    - Add equipment filter in ExerciseLibraryModal
    - Update seed data with equipment information
    - _Future enhancement for better exercise filtering_

- [ ]* 15. Push notification system
  - [ ]* 15.1 Set up Expo Notifications
    - Configure Expo push notification credentials
    - Request notification permissions from users
    - Store push tokens in database
    - _Future enhancement for real-time updates_
  
  - [ ]* 15.2 Implement workout assignment notifications
    - Send notification when workout is assigned
    - Include workout name and scheduled date
    - Handle notification tap to navigate to workout
    - _Future enhancement for athlete engagement_
  
  - [ ]* 15.3 Implement reminder notifications
    - Schedule notification for workout day at 8 AM
    - Send overdue reminder after 24 hours
    - Send notification when trainer modifies workout
    - _Future enhancement for adherence tracking_
  
  - [ ]* 15.4 Add notification preferences
    - Allow users to enable/disable notifications
    - Add notification settings screen
    - Display in-app badges when notifications disabled
    - _Future enhancement for user control_

- [ ]* 16. Advanced rest timer features
  - [ ]* 16.1 Add audio/haptic feedback
    - Play sound when rest timer expires
    - Add haptic vibration notification
    - Allow customizing notification sounds
    - _Future enhancement for better user experience_
  
  - [ ]* 16.2 Add pause/resume functionality
    - Add pause button to rest timer
    - Allow resuming paused timer
    - Track total rest time taken
    - _Future enhancement for flexibility_

- [ ]* 17. Workout editing and modification
  - [ ]* 17.1 Add edit workout assignment functionality
    - Check if workout has been started before allowing edit
    - Update workout assignment details
    - Send notification to athlete about changes
    - Prevent editing if workout is in_progress or completed
    - _Future enhancement for trainer flexibility_
  
  - [ ]* 17.2 Add edit workout template functionality
    - Allow editing saved templates
    - Update all future assignments based on template
    - Add version history for templates
    - _Future enhancement for template management_

- [ ]* 18. Advanced progress tracking
  - [ ]* 18.1 Track actual performance data
    - Add actual_reps, actual_weight, actual_duration to progress table
    - Allow athletes to log actual performance vs prescribed
    - Display performance variance in trainer dashboard
    - _Future enhancement for detailed analytics_
  
  - [ ]* 18.2 Add workout notes and feedback
    - Allow athletes to add notes after completing workout
    - Allow trainers to comment on completed workouts
    - Display feedback in workout history
    - _Future enhancement for communication_

- [ ]* 19. Workout analytics and insights
  - [ ]* 19.1 Add workout completion trends
    - Display completion rate over time
    - Show weekly/monthly workout volume
    - Identify patterns in skipped workouts
    - _Future enhancement for data-driven coaching_
  
  - [ ]* 19.2 Add exercise frequency tracking
    - Track which exercises are used most
    - Show muscle group balance
    - Suggest underworked muscle groups
    - _Future enhancement for balanced programming_

- [ ]* 20. Workout sharing and templates
  - [ ]* 20.1 Share workout templates between trainers
    - Export workout template as JSON
    - Import workout template from file
    - Share via messaging apps
    - _Future enhancement for collaboration_
  
  - [ ]* 20.2 Public workout library
    - Create community workout templates
    - Rate and review templates
    - Search public templates by goal/difficulty
    - _Future enhancement for community features_
