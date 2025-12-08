import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  Alert,
  RefreshControl
} from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { trpc } from '../../lib/trpc';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Import refactored components
import {
  ScheduleHeader,
  ViewModeToggle,
  CalendarView,
  EventListView,
  EventTypesLegend,
  ViewMode,
  Event,
  EventType
} from '../../components/schedule';

export function AthleteScheduleScreen({ onBack }: { onBack: () => void }) {
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data
  useEffect(() => {
    if (user?.id) {
      fetchEvents();
      fetchEventTypes();
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
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const scheduleData = await trpc.events.getMySchedule.query({
        start_date: monthStart,
        end_date: monthEnd,
      });

      // Transform the data to match the expected format
      const transformedEvents = scheduleData.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        status: event.status,
        event_type_name: event.event_type?.name,
        event_type_color: event.event_type?.color,
        event_type_icon: event.event_type?.icon,
        created_by_name: event.created_by?.full_name,
      }));
      setEvents(transformedEvents);
    } catch (error) {
      console.error('❌ Error fetching schedule:', error);
      Alert.alert('Error', 'Failed to load schedule. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchEventTypes = async () => {
    try {
      const eventTypesData = await trpc.events.getEventTypes.query();
      setEventTypes(eventTypesData);
    } catch (error) {
      console.error('❌ Error fetching event types:', error);
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
            title="My Schedule"
            subtitle={
              viewMode === 'calendar'
                ? 'View your training events and activities'
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
    </View>
  );
}
