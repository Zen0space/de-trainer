import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export interface CustomCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  minDate?: Date;
  events?: Array<{ start_date: string; event_type_color: string }>;
}

interface Week {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onClose,
  minDate,
  events = []
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
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
        weeks.push({
          weekNumber: weeks.length + 1,
          startDate: currentWeekStart,
          endDate: weekEnd,
          days: days
        });
      }
      
      currentWeekStart = addDays(weekEnd, 1);
      
      // Safety check: don't create more than 6 weeks
      if (weeks.length >= 6) break;
    }
    
    return weeks;
  };

  const weeks = getWeeksInMonth(currentMonth);

  // Auto-expand week containing selected date
  useEffect(() => {
    const weekIndex = weeks.findIndex(week => 
      selectedDate >= week.startDate && selectedDate <= week.endDate
    );
    if (weekIndex !== -1) {
      setExpandedWeek(weekIndex);
    }
  }, [currentMonth]);

  const isDateSelectable = (date: Date) => {
    if (minDate) {
      return date >= minDate;
    }
    return true;
  };

  const isDateSelected = (date: Date) => {
    return format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  };

  const isTodayDate = (date: Date) => {
    return isToday(date);
  };

  const isCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentMonth);
  };

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

  const toggleWeek = (index: number) => {
    setExpandedWeek(expandedWeek === index ? null : index);
  };

  const formatWeekRange = (week: Week) => {
    const start = format(week.startDate, 'MMM d');
    const end = format(week.endDate, 'd');
    return `${start}-${end}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
      }}>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color="#6b7280" />
        </TouchableOpacity>

        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: '#f3f4f6'
            }}
          >
            <Feather name="chevron-left" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: '#f3f4f6'
            }}
          >
            <Feather name="chevron-right" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weeks Accordion */}
      <ScrollView style={{ flex: 1 }}>
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
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                  backgroundColor: isExpanded ? '#f9fafb' : 'white'
                }}
              >
                <View>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Week {week.weekNumber}
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: '#6b7280',
                    marginTop: 2
                  }}>
                    {formatWeekRange(week)}
                  </Text>
                </View>
                <Feather 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6b7280" 
                />
              </TouchableOpacity>

              {/* Week Content */}
              {isExpanded && (
                <View style={{
                  backgroundColor: '#fafafa',
                  paddingVertical: 12,
                  paddingHorizontal: 8
                }}>
                  {/* Weekday headers */}
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 8,
                    paddingHorizontal: 4
                  }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 11,
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
                    paddingHorizontal: 4
                  }}>
                    {week.days.map((date, dayIndex) => {
                      const selectable = isDateSelectable(date);
                      const selected = isDateSelected(date);
                      const today = isTodayDate(date);
                      const currentMonth = isCurrentMonth(date);
                      const hasEventOnDate = hasEvent(date);
                      const eventColor = getEventColor(date);

                      return (
                        <TouchableOpacity
                          key={dayIndex}
                          onPress={() => selectable && onDateSelect(date)}
                          disabled={!selectable}
                          style={{
                            flex: 1,
                            aspectRatio: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            margin: 2,
                            backgroundColor: selected 
                              ? '#3b82f6' 
                              : today 
                                ? '#fef3c7' 
                                : hasEventOnDate
                                  ? `${eventColor}15`
                                  : 'white',
                            opacity: currentMonth ? 1 : 0.3,
                            borderWidth: hasEventOnDate && !selected ? 1.5 : 0,
                            borderColor: hasEventOnDate && !selected ? eventColor : 'transparent'
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            fontWeight: selected ? '600' : today ? '600' : 'normal',
                            color: selected 
                              ? 'white' 
                              : today 
                                ? '#f59e0b' 
                                : selectable 
                                  ? '#374151' 
                                  : '#d1d5db'
                          }}>
                            {format(date, 'd')}
                          </Text>
                          {hasEventOnDate && !selected && (
                            <View style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: eventColor,
                              marginTop: 2
                            }} />
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
      </ScrollView>
    </SafeAreaView>
  );
};