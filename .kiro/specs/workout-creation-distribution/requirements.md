# Requirements Document

## Introduction

This feature enables trainers to create structured workout programs and distribute them to their enrolled athletes through the Jejak Atlet mobile application. The system will support comprehensive workout planning including exercise selection, sets/reps configuration, rest periods, scheduling, and real-time distribution with notifications. Athletes will receive assigned workouts in their mobile app and can track completion status.

## Glossary

- **Workout System**: The complete workout creation, distribution, and tracking functionality within the Jejak Atlet application
- **Trainer**: A verified user with trainer role who creates and assigns workouts to athletes
- **Athlete**: A user with athlete role who receives and completes assigned workouts
- **Workout Template**: A reusable workout structure created by a trainer containing exercises, sets, reps, and other parameters
- **Workout Assignment**: A specific workout distributed to one or more athletes with a scheduled date
- **Exercise Library**: A database of exercises available for selection when building workouts
- **Superset**: A group of 2+ exercises performed consecutively with minimal rest between them
- **Circuit**: A group of 3+ exercises performed in sequence for multiple rounds
- **Rest Timer**: A countdown timer between sets or exercises
- **Workout Session**: An instance of an athlete performing an assigned workout
- **Completion Status**: The state of a workout assignment (pending, in-progress, completed, skipped)

## Requirements

### Requirement 1: Workout Creation Interface

**User Story:** As a trainer, I want to create structured workouts with multiple exercises, so that I can design comprehensive training programs for my athletes

#### Acceptance Criteria

1. WHEN the Trainer accesses the workout creation screen, THE Workout System SHALL display a form with fields for workout name, description, and exercise list
2. WHEN the Trainer adds an exercise to the workout, THE Workout System SHALL provide options to specify sets, reps, and rest time for that exercise
3. *(Future)* WHEN the Trainer selects multiple exercises, THE Workout System SHALL provide an option to group them as a superset or circuit
4. WHEN the Trainer saves a workout, THE Workout System SHALL validate that at least one exercise is included and a workout name is provided
5. WHERE the Trainer chooses to save as template, THE Workout System SHALL store the workout for future reuse without assigning to athletes

### Requirement 2: Exercise Library Management

**User Story:** As a trainer, I want to search and select from a comprehensive exercise library, so that I can quickly build workouts without manually entering exercise details

#### Acceptance Criteria

1. WHEN the Trainer opens the exercise selection interface, THE Workout System SHALL display a searchable list of exercises categorized by muscle group
2. WHEN the Trainer enters a search query, THE Workout System SHALL filter exercises by name or muscle group in real-time
3. WHEN the Trainer selects an exercise, THE Workout System SHALL add it to the current workout with default parameters (3 sets, 10 reps, 60 seconds rest)
4. *(Future)* WHERE the exercise library does not contain a needed exercise, THE Workout System SHALL allow the Trainer to create a custom exercise with name, description, muscle group, and equipment fields
5. *(Future)* WHEN the Trainer creates a custom exercise, THE Workout System SHALL save it to their personal exercise library for future use

### Requirement 3: Workout Distribution to Athletes

**User Story:** As a trainer, I want to assign workouts to specific athletes with scheduled dates, so that I can manage their training programs effectively

#### Acceptance Criteria

1. WHEN the Trainer completes workout creation, THE Workout System SHALL display an option to assign the workout to athletes
2. WHEN the Trainer selects the assign option, THE Workout System SHALL display a list of all enrolled athletes with approved enrollment status
3. WHEN the Trainer selects one or more athletes, THE Workout System SHALL provide a date picker to schedule the workout
4. WHEN the Trainer confirms the assignment, THE Workout System SHALL create workout assignment records for each selected athlete with the scheduled date
5. *(Future)* WHEN a workout assignment is created, THE Workout System SHALL send a push notification to each assigned athlete with the workout name and scheduled date

### Requirement 4: Athlete Workout Viewing

**User Story:** As an athlete, I want to view my assigned workouts with all exercise details, so that I can understand what I need to perform

#### Acceptance Criteria

1. WHEN the Athlete opens their workout list, THE Workout System SHALL display all assigned workouts ordered by scheduled date with completion status indicators
2. WHEN the Athlete selects a workout, THE Workout System SHALL display the workout name, description, estimated duration, and a list of all exercises with their parameters
3. WHERE exercises are grouped as supersets or circuits, THE Workout System SHALL visually indicate the grouping with distinct styling
4. WHEN the Athlete views an exercise, THE Workout System SHALL display sets, reps, weight, rest time, and any notes provided by the trainer
5. WHEN the Athlete has not started the workout, THE Workout System SHALL display a "Start Workout" button to begin the session

### Requirement 5: Workout Execution and Tracking

**User Story:** As an athlete, I want to track my progress through a workout with rest timers, so that I can follow the program accurately

#### Acceptance Criteria

1. WHEN the Athlete starts a workout, THE Workout System SHALL display the first exercise with a checkbox for each set
2. WHEN the Athlete completes a set, THE Workout System SHALL activate a rest timer with the specified rest duration
3. *(Future)* WHEN the rest timer expires, THE Workout System SHALL provide an audio or haptic notification to signal the next set
4. WHEN the Athlete completes all sets for an exercise, THE Workout System SHALL automatically advance to the next exercise
5. WHEN the Athlete completes all exercises, THE Workout System SHALL mark the workout assignment as completed and update the completion timestamp

### Requirement 6: Workout Progress Monitoring

**User Story:** As a trainer, I want to see which athletes have completed their assigned workouts, so that I can monitor adherence and provide feedback

#### Acceptance Criteria

1. WHEN the Trainer views their athlete list, THE Workout System SHALL display a completion percentage for each athlete based on assigned workouts in the current week
2. WHEN the Trainer selects an athlete, THE Workout System SHALL display a list of all workout assignments with completion status and completion date
3. WHERE a workout is marked as completed, THE Workout System SHALL display the completion timestamp
4. WHERE a workout is past its scheduled date and not completed, THE Workout System SHALL highlight it as overdue with a warning indicator
5. WHEN the Trainer views workout statistics, THE Workout System SHALL calculate and display total workouts assigned, completed, and completion rate percentage

### Requirement 7: Workout Template Management

**User Story:** As a trainer, I want to save and reuse workout templates, so that I can efficiently create similar workouts without rebuilding from scratch

#### Acceptance Criteria

1. WHEN the Trainer saves a workout as a template, THE Workout System SHALL store it in their personal template library with the workout name and creation date
2. WHEN the Trainer accesses the template library, THE Workout System SHALL display all saved templates with search and filter options
3. WHEN the Trainer selects a template, THE Workout System SHALL provide options to assign it directly or edit before assigning
4. WHEN the Trainer edits a template, THE Workout System SHALL create a new workout instance without modifying the original template
5. WHEN the Trainer deletes a template, THE Workout System SHALL remove it from the library without affecting previously assigned workouts based on that template

### Requirement 8: Workout Modification and Cancellation

**User Story:** As a trainer, I want to modify or cancel assigned workouts, so that I can adapt to changing circumstances or athlete needs

#### Acceptance Criteria

1. WHERE a workout assignment has not been started by the athlete, WHEN the Trainer selects the assignment, THE Workout System SHALL provide options to reschedule or cancel
2. *(Future)* WHEN the Trainer edits an unstarted workout assignment, THE Workout System SHALL update the assignment and send a notification to the athlete about the changes
3. WHEN the Trainer cancels a workout assignment, THE Workout System SHALL mark it as cancelled
4. WHERE a workout assignment has been started or completed, THE Workout System SHALL prevent editing or cancellation to maintain data integrity
5. WHEN the Trainer reschedules a workout, THE Workout System SHALL update the scheduled date

### Requirement 9: Offline Workout Access

**User Story:** As an athlete, I want to access my assigned workouts offline, so that I can train even without internet connectivity

#### Acceptance Criteria

1. WHEN the Athlete has an active internet connection, THE Workout System SHALL synchronize all assigned workouts to the local device database
2. WHERE the Athlete loses internet connectivity, THE Workout System SHALL allow viewing and starting workouts from the local database
3. WHEN the Athlete completes a workout offline, THE Workout System SHALL store the completion data locally with a sync pending flag
4. WHEN internet connectivity is restored, THE Workout System SHALL automatically synchronize pending workout completions to the remote database
5. WHERE sync conflicts occur, THE Workout System SHALL prioritize the athlete's completion data and update the remote database accordingly

### Requirement 10: Workout Notifications *(Future Enhancement)*

**User Story:** As an athlete, I want to receive notifications about new workout assignments and upcoming scheduled workouts, so that I stay on track with my training program

#### Acceptance Criteria

1. *(Future)* WHEN a Trainer assigns a workout to the Athlete, THE Workout System SHALL send a push notification with the workout name and scheduled date
2. *(Future)* WHEN a scheduled workout date arrives, THE Workout System SHALL send a reminder notification to the Athlete at 8:00 AM local time
3. *(Future)* WHERE a workout is overdue by 24 hours, THE Workout System SHALL send a follow-up reminder notification to the Athlete
4. *(Future)* WHEN a Trainer modifies an assigned workout, THE Workout System SHALL send a notification to the Athlete indicating the changes
5. *(Future)* WHERE the Athlete has disabled notifications in device settings, THE Workout System SHALL display in-app notification badges on the workout tab
