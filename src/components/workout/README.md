# Workout Components

This directory contains React Native components for the workout creation and distribution feature.

## Components

### 1. WorkoutAssignmentModal

A modal component that allows trainers to assign workout templates to enrolled athletes.

**Features:**
- Fetches and displays enrolled athletes with approved status
- Athlete selection with checkboxes
- Select all / deselect all functionality
- Date picker for scheduling workouts
- Validation for athlete selection and date
- Responsive design for different screen sizes

**Props:**
```typescript
interface WorkoutAssignmentModalProps {
  visible: boolean;
  workoutTemplateId: number;
  workoutTemplateName: string;
  trainerId: number;
  onClose: () => void;
  onAssignSuccess: () => void;
}
```

**Usage:**
```tsx
import { WorkoutAssignmentModal } from '../../components/workout/WorkoutAssignmentModal';

<WorkoutAssignmentModal
  visible={showModal}
  workoutTemplateId={templateId}
  workoutTemplateName="Upper Body Strength"
  trainerId={user.id}
  onClose={() => setShowModal(false)}
  onAssignSuccess={() => {
    Alert.alert('Success', 'Workout assigned successfully');
  }}
/>
```

### 2. WorkoutTemplateLibrary

A component that displays a list of workout templates with search and management functionality.

**Features:**
- Displays saved workout templates in list view
- Search functionality to filter templates
- Template selection for assignment
- Edit template button
- Delete template button with confirmation
- Create new workout button
- Empty state for no templates
- Responsive design

**Props:**
```typescript
interface WorkoutTemplateLibraryProps {
  trainerId: number;
  onSelectTemplate: (template: WorkoutTemplate) => void;
  onEditTemplate: (templateId: number) => void;
  onCreateNew: () => void;
}
```

**Usage:**
```tsx
import { WorkoutTemplateLibrary } from '../../components/workout/WorkoutTemplateLibrary';

<WorkoutTemplateLibrary
  trainerId={user.id}
  onSelectTemplate={(template) => {
    // Open assignment modal
    setSelectedTemplate(template);
    setShowAssignmentModal(true);
  }}
  onEditTemplate={(templateId) => {
    // Open workout builder in edit mode
    setEditTemplateId(templateId);
    setShowWorkoutBuilder(true);
  }}
  onCreateNew={() => {
    // Open workout builder in create mode
    setShowWorkoutBuilder(true);
  }}
/>
```

### 3. ExerciseLibraryModal

A modal component for browsing and selecting exercises from the exercise library.

**Features:**
- Search exercises by name
- Filter by muscle group (All, Chest, Legs, Back, Shoulders, Arms, Core)
- Display exercise cards with name and muscle group
- Single-select mode for adding exercises

### 4. ExerciseConfigModal

A modal component for configuring exercise parameters (sets, reps, rest time).

**Features:**
- Number pickers for sets (1-10)
- Number pickers for reps (1-100)
- Number picker for rest time (0-300 seconds)
- Save and cancel buttons

## Integration Example

Here's a complete example of how to integrate all workout components in a screen:

```tsx
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { WorkoutTemplateLibrary } from '../../components/workout/WorkoutTemplateLibrary';
import { WorkoutAssignmentModal } from '../../components/workout/WorkoutAssignmentModal';
import { WorkoutBuilderScreen } from '../../screens/trainer/WorkoutBuilderScreen';

export function WorkoutManagementScreen() {
  const { user } = useSession();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState(null);

  if (showWorkoutBuilder) {
    return (
      <WorkoutBuilderScreen
        templateId={editTemplateId}
        onBack={() => {
          setShowWorkoutBuilder(false);
          setEditTemplateId(null);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WorkoutTemplateLibrary
        trainerId={user.id}
        onSelectTemplate={(template) => {
          setSelectedTemplate(template);
          setShowAssignmentModal(true);
        }}
        onEditTemplate={(templateId) => {
          setEditTemplateId(templateId);
          setShowWorkoutBuilder(true);
        }}
        onCreateNew={() => {
          setEditTemplateId(null);
          setShowWorkoutBuilder(true);
        }}
      />
      
      {showAssignmentModal && selectedTemplate && (
        <WorkoutAssignmentModal
          visible={showAssignmentModal}
          workoutTemplateId={selectedTemplate.id}
          workoutTemplateName={selectedTemplate.name}
          trainerId={user.id}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedTemplate(null);
          }}
          onAssignSuccess={() => {
            setShowAssignmentModal(false);
            setSelectedTemplate(null);
            Alert.alert('Success', 'Workout assigned successfully');
          }}
        />
      )}
    </View>
  );
}
```

## API Functions Used

The components use the following API functions from `src/lib/offline-api.ts`:

- `getTrainerEnrollments(trainerId, status)` - Fetch enrolled athletes
- `createWorkoutAssignment(data)` - Create workout assignments
- `getWorkoutTemplates(trainerId)` - Fetch workout templates
- `deleteWorkoutTemplate(id, trainerId)` - Delete a template

## Dependencies

- `@react-native-community/datetimepicker` - Date picker for scheduling
- `@expo/vector-icons` - Icons (Feather icon set)
- React Native core components (Modal, ScrollView, Pressable, etc.)

## Responsive Design

All components are responsive and adapt to:
- Small screens (< 380px width)
- Regular screens (380px - 600px width)
- Tablets (> 600px width)

Font sizes, spacing, and padding adjust automatically based on screen size.

## Validation

### WorkoutAssignmentModal Validation:
- At least one athlete must be selected
- Scheduled date cannot be in the past
- Workout template must exist and belong to the trainer
- Athletes must be enrolled with approved status

### WorkoutTemplateLibrary Validation:
- Confirmation dialog before deleting templates
- Error handling for failed operations
- Loading states during data fetching

## Offline Support

All components work offline-first:
- Data is read from local SQLite database
- Changes are saved locally immediately
- Background sync occurs when online
- User gets instant feedback regardless of network status
