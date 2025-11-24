import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  parseISO
} from 'date-fns';
import { Event } from './EventCard';

export interface CalendarViewProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  events: Event[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  titleFontSize?: number;
  fontSize?: number;
  spacing?: number;
  cardPadding?: number;
}

interface Week {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
  eventCount: number;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onToday,
  events,
  selectedDate,
  onDateSelect,
  titleFontSize = 24,
  fontSize = 16,
  spacing = 16,
  cardPadding = 20
}) => {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Get weeks in current month
  const getWeeksInMonth = (date: Date): Week[] => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const weeks: Week[] = [];
    let currentWeekStart = startOfWeek(monthStart);
    
    while (currentWeekStart <= monthEnd || weeks.length === 0) {
      const weekEnd = endOfWeek(currentWeekStart);
      const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
      
      // Only include weeks that have at least one day in the current month
      const hasMonthDays = days.some(day => isSameMonth(day, date));
      
      if (hasMonthDays) {
        // Count events in this week
        const eventCount = events.filter(event => {
          const eventDate = parseISO(event.start_date);
          return days.some(day => isSameDay(day, eventDate));
        }).length;

        weeks.push({
          weekNumber: weeks.length + 1,
          startDate: currentWeekStart,
          endDate: weekEnd,
          days: days,
          eventCount
        });
      }
      
      currentWeekStart = addDays(weekEnd, 1);
      
      // Safety check: don't create more than 6 weeks
      if (weeks.length >= 6) break;
    }
    
    return weeks;
  };

  const weeks = getWeeksInMonth(currentMonth);

  // Auto-expand week containing today
  useEffect(() => {
    const today = new Date();
    const weekIndex = weeks.findIndex(week => 
      today >= week.startDate && today <= week.endDate
    );
    if (weekIndex !== -1) {
      setExpandedWeek(weekIndex);
    }
  }, [currentMonth]);

  const hasEvent = (date: Date) => {
    return events.some(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const getEventColor = (date: Date) => {
    const event = events.find(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, date);
    });
    return event?.event_type_color || '#10b981';
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const toggleWeek = (index: number) => {
    setExpandedWeek(expandedWeek === index ? null : index);
  };

  const formatWeekRange = (week: Week) => {
    const start = format(week.startDate, 'MMM d');
    const end = format(week.endDate, 'd');
    return `${start}-${end}`;
  };

  const isCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentMonth);
  };

  const renderCalendarHeader = () => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing,
      padding: 4
    }}>
      <Pressable
        style={{
          padding: 8,
          borderRadius: 8,
          backgroundColor: '#f3f4f6'
        }}
        onPress={onPreviousMonth}
      >
        <Feather name="chevron-left" size={20} color="#6b7280" />
      </Pressable>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{
          fontSize: titleFontSize,
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
      </View>

      <Pressable
        style={{
          padding: 8,
          borderRadius: 8,
          backgroundColor: '#f3f4f6'
        }}
        onPress={onNextMonth}
      >
        <Feather name="chevron-right" size={20} color="#6b7280" />
      </Pressable>
    </View>
  );

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 16,
      padding: cardPadding,
      marginBottom: spacing
    }}>
      {renderCalendarHeader()}

      {/* Weeks Accordion */}
      <View>
        {weeks.map((week, index) => {
          const isExpanded = expandedWeek === index;
          
          return (
            <View key={index}>
              {/* Week Header */}
              <TouchableOpacity
                onPress={() => toggleWeek(index)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                  backgroundColor: isExpanded ? '#f9fafb' : 'white',
                  borderRadius: 8,
                  marginBottom: 4
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      Week {week.weekNumber}
                    </Text>
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280'
                    }}>
                      • {formatWeekRange(week)}
                    </Text>
                  </View>
                  {week.eventCount > 0 && (
                    <Text style={{
                      fontSize: fontSize - 3,
                      color: '#10b981',
                      marginTop: 2,
                      fontWeight: '500'
                    }}>
                      {week.eventCount} event{week.eventCount !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                <Feather 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#6b7280" 
                />
              </TouchableOpacity>

              {/* Week Content */}
              {isExpanded && (
                <View style={{
                  backgroundColor: '#fafafa',
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  marginBottom: 8
                }}>
                  {/* Weekday headers */}
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 8,
                    paddingHorizontal: 2
                  }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: fontSize - 4,
                          fontWeight: '600',
                          color: '#6b7280'
                        }}>
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Days row */}
                  <View style={{
                    flexDirection: 'row',
                    paddingHorizontal: 2
                  }}>
                    {week.days.map((date, dayIndex) => {
                      const today = isToday(date);
                      const currentMonthDay = isCurrentMonth(date);
                      const hasEventOnDate = hasEvent(date);
                      const eventColor = getEventColor(date);
                      const dayEvents = getEventsForDay(date);

                      return (
                        <TouchableOpacity
                          key={dayIndex}
                          onPress={() => onDateSelect(date)}
                          style={{
                            flex: 1,
                            aspectRatio: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            margin: 2,
                            backgroundColor: today 
                              ? '#fef3c7' 
                              : hasEventOnDate
                                ? `${eventColor}15`
                                : 'white',
                            opacity: currentMonthDay ? 1 : 0.3,
                            borderWidth: hasEventOnDate ? 1.5 : 0,
                            borderColor: hasEventOnDate ? eventColor : 'transparent',
                            padding: 4
                          }}
                        >
                          <Text style={{
                            fontSize: fontSize - 2,
                            fontWeight: today ? '600' : 'normal',
                            color: today 
                              ? '#f59e0b' 
                              : '#374151'
                          }}>
                            {format(date, 'd')}
                          </Text>
                          {dayEvents.length > 0 && (
                            <View style={{
                              flexDirection: 'row',
                              gap: 2,
                              marginTop: 2
                            }}>
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <View
                                  key={idx}
                                  style={{
                                    width: 3,
                                    height: 3,
                                    borderRadius: 1.5,
                                    backgroundColor: event.event_type_color
                                  }}
                                />
                              ))}
                            </View>
                          )}
                          {dayEvents.length > 3 && (
                            <Text style={{
                              fontSize: 8,
                              color: '#6b7280',
                              marginTop: 1
                            }}>
                              +{dayEvents.length - 3}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Today Button */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing }}>
        <Pressable
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            backgroundColor: '#f3f4f6',
            borderRadius: 8
          }}
          onPress={onToday}
        >
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#374151'
          }}>
            Today
          </Text>
        </Pressable>
      </View>
    </View>
  );
};