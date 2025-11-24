import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  Alert,
  RefreshControl
} from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { tursoDbHelpers } from '../../lib/turso-database';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Import refactored components
import {
  ScheduleHeader,
  ViewModeToggle,
  CalendarView,
  EventListView,
  EventTypesLegend,
  FloatingActionButton,
  CreateEventModal,
  ViewMode,
  Event,
  EventType,
  NewEvent,
  EnrolledAthlete
} from '../../components/schedule';

export function TrainerScheduleScreen({ onBack }: { onBack: () => void }) {
  const { user } = useSession();
  const { width } = useWindowDimensions();

  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [enrolledAthletes, setEnrolledAthletes] = useState<EnrolledAthlete[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Fetch data
  useEffect(() => {
    if (user?.id) {
      fetchEvents();
      fetchEventTypes();
      fetchEnrolledAthletes();
    }
  }, [user?.id, currentMonth]);

  const fetchEvents = async (isRefreshAction = false) => {
    if (!user?.id) return;

    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd 00:00:00');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd 23:59:59');

      const result = await tursoDbHelpers.all(`
        SELECT
          e.id,
          e.title,
          e.description,
          e.start_date,
          e.end_date,
          e.location,
          e.status,
          et.name as event_type_name,
          et.color as event_type_color,
          et.icon as event_type_icon,
          u.full_name as created_by_name,
          COUNT(ep.id) as total_participants,
          COUNT(CASE WHEN ep.status = 'confirmed' THEN 1 END) as confirmed_participants
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        JOIN users u ON e.created_by_user_id = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        WHERE e.created_by_user_id = ?
        AND e.start_date >= ?
        AND e.start_date <= ?
        GROUP BY e.id, e.title, e.description, e.start_date, e.end_date, e.location, e.status,
                 et.name, et.color, et.icon, u.full_name
        ORDER BY e.start_date ASC
      `, [user.id, monthStart, monthEnd]);

      setEvents(result || []);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      Alert.alert('Error', 'Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchEventTypes = async () => {
    try {
      const result = await tursoDbHelpers.all(`
        SELECT id, name, color, icon
        FROM event_types
        ORDER BY name ASC
      `);

      setEventTypes(result || []);
    } catch (error) {
      console.error('❌ Error fetching event types:', error);
    }
  };

  const fetchEnrolledAthletes = async () => {
    if (!user?.id) return;

    try {
      const result = await tursoDbHelpers.all(`
        SELECT u.id, u.full_name
        FROM enrollments e
        JOIN users u ON e.athlete_id = u.id
        WHERE e.trainer_id = ?
        AND e.status = 'approved'
        ORDER BY u.full_name ASC
      `, [user.id]);

      setEnrolledAthletes(result || []);
    } catch (error) {
      console.error('❌ Error fetching enrolled athletes:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleRefresh = () => {
    fetchEvents(true);
  };

  const createEvent = async (newEventData: NewEvent) => {
    if (!user?.id) return;

    setIsCreatingEvent(true);

    try {
      const result = await tursoDbHelpers.run(`
        INSERT INTO events (
          title,
          description,
          event_type_id,
          created_by_user_id,
          start_date,
          end_date,
          location,
          max_participants,
          status,
          is_public,
          requires_approval,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        newEventData.title.trim(),
        newEventData.description.trim(),
        newEventData.event_type_id,
        user.id,
        newEventData.start_date,
        newEventData.end_date,
        newEventData.location.trim(),
        newEventData.max_participants ? parseInt(newEventData.max_participants) : null,
        newEventData.is_public ? 1 : 0,
        newEventData.requires_approval ? 1 : 0
      ]);

      if (result && result.lastInsertRowid) {
        const eventId = result.lastInsertRowid;

        // Insert event participants if any athletes were selected
        if (newEventData.participant_ids.length > 0) {
          for (const athleteId of newEventData.participant_ids) {
            await tursoDbHelpers.run(`
              INSERT INTO event_participants (
                event_id,
                athlete_id,
                assigned_by_user_id,
                status,
                created_at,
                updated_at
              ) VALUES (?, ?, ?, 'registered', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [eventId, athleteId, user.id]);
          }
        }

        Alert.alert('Success', 'Event created successfully!');
        setShowCreateEventModal(false);
        fetchEvents(true); // Refresh events
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
      console.error('❌ Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleEventPress = (event: Event) => {
    // TODO: Open event details modal
    Alert.alert('Event Details', event.title);
  };

  // Bottom nav height calculation
  const bottomNavHeight = (isSmallScreen ? 70 : isTablet ? 90 : 80) + 32; // nav height + buffer

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: containerPadding,
          paddingBottom: containerPadding + bottomNavHeight
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }>
        <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>

          {/* Header */}
          <ScheduleHeader
            onBack={onBack}
            title="Schedule Management"
            subtitle={
              viewMode === 'calendar'
                ? 'View and manage your training calendar'
                : 'View your events in list format'
            }
            cardPadding={cardPadding}
            titleFontSize={titleFontSize}
            fontSize={fontSize}
            spacing={spacing}
          />

          {/* View Mode Toggle */}
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            fontSize={fontSize}
            spacing={spacing}
          />

          {viewMode === 'calendar' && (
            /* Calendar View */
            <CalendarView
              currentMonth={currentMonth}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              events={events}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              titleFontSize={titleFontSize}
              fontSize={fontSize}
              spacing={spacing}
              cardPadding={cardPadding}
            />
          )}

          {/* Events List */}
          <EventListView
            events={events}
            isLoading={isLoading}
            currentMonth={currentMonth}
            titleFontSize={titleFontSize}
            fontSize={fontSize}
            spacing={spacing}
            cardPadding={cardPadding}
            onEventPress={handleEventPress}
          />

          {/* Event Types Legend */}
          <EventTypesLegend
            eventTypes={eventTypes}
            fontSize={fontSize}
            spacing={spacing}
            cardPadding={cardPadding}
          />

        </View>
      </ScrollView>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onCreateEvent={createEvent}
        isCreatingEvent={isCreatingEvent}
        eventTypes={eventTypes}
        enrolledAthletes={enrolledAthletes}
        events={events.map(e => ({ start_date: e.start_date, event_type_color: e.event_type_color }))}
        containerPadding={containerPadding}
        titleFontSize={titleFontSize}
        fontSize={fontSize}
        spacing={spacing}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={() => setShowCreateEventModal(true)}
        bottomNavHeight={bottomNavHeight}
        containerPadding={containerPadding}
      />
    </View>
  );
}