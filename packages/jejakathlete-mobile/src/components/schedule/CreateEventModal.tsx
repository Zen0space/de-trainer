import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { CustomCalendar, CustomCalendarProps } from './CustomCalendar';
import { CustomTimePicker, CustomTimePickerProps } from './CustomTimePicker';
import { EventType } from './EventTypesLegend';

export interface NewEvent {
  title: string;
  description: string;
  event_type_id: number;
  start_date: string;
  end_date: string;
  location: string;
  max_participants: string;
  is_public: boolean;
  requires_approval: boolean;
  participant_ids: number[];
}

export interface EnrolledAthlete {
  id: number;
  full_name: string;
}

export interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateEvent: (event: NewEvent) => Promise<void>;
  isCreatingEvent: boolean;
  eventTypes: EventType[];
  enrolledAthletes: EnrolledAthlete[];
  events?: Array<{ start_date: string; event_type_color: string }>;
  initialEvent?: Partial<NewEvent>;
  containerPadding?: number;
  titleFontSize?: number;
  fontSize?: number;
  spacing?: number;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
  onCreateEvent,
  isCreatingEvent,
  eventTypes,
  enrolledAthletes,
  events = [],
  initialEvent,
  containerPadding = 24,
  titleFontSize = 24,
  fontSize = 16,
  spacing = 16
}) => {
  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: '',
    description: '',
    event_type_id: eventTypes.length > 0 ? eventTypes[0].id : 1,
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: format(new Date().setHours(new Date().getHours() + 1), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    max_participants: '',
    is_public: false,
    requires_approval: false,
    participant_ids: [],
    ...initialEvent
  });

  // Custom date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  const [tempSelectedTime, setTempSelectedTime] = useState({ hour: 9, minute: 0 });

  // Cleanup date picker states when modal is closed
  React.useEffect(() => {
    if (!visible) {
      setShowStartDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible]);

  const handleCreateEvent = async () => {
    // Validation
    if (!newEvent.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!newEvent.start_date || !newEvent.end_date) {
      Alert.alert('Error', 'Please select start and end dates');
      return;
    }

    if (new Date(newEvent.start_date) >= new Date(newEvent.end_date)) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    await onCreateEvent(newEvent);
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      event_type_id: eventTypes.length > 0 ? eventTypes[0].id : 1,
      start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date().setHours(new Date().getHours() + 1), "yyyy-MM-dd'T'HH:mm"),
      location: '',
      max_participants: '',
      is_public: false,
      requires_approval: false,
      participant_ids: []
    });
  };

  const handleClose = () => {
    if (!isCreatingEvent) {
      onClose();
      resetForm();
    }
  };

  // Custom date picker handlers
  const openCustomDatePicker = (mode: 'start' | 'end') => {
    const currentDate = mode === 'start' ? new Date(newEvent.start_date) : new Date(newEvent.end_date);
    setTempSelectedDate(currentDate);
    setTempSelectedTime({ hour: currentDate.getHours(), minute: currentDate.getMinutes() });
    setPickerMode(mode);
    setShowStartDatePicker(true);
    setShowTimePicker(false);
  };

  const handleDateSelection = (date: Date) => {
    setTempSelectedDate(date);
    setShowStartDatePicker(false);
    setShowTimePicker(true);
  };

  const handleTimeSelection = () => {
    const finalDate = new Date(tempSelectedDate);
    finalDate.setHours(tempSelectedTime.hour);
    finalDate.setMinutes(tempSelectedTime.minute);

    const formattedDate = format(finalDate, "yyyy-MM-dd'T'HH:mm");

    setNewEvent(prev => ({
      ...prev,
      [pickerMode === 'start' ? 'start_date' : 'end_date']: formattedDate
    }));

    setShowTimePicker(false);
    setShowStartDatePicker(false);
  };

  const cancelDatePicker = () => {
    setShowStartDatePicker(false);
    setShowTimePicker(false);
  };

  const formatDateTimeForDisplay = (dateString: string) => {
    try {
      if (!dateString || dateString === 'Invalid Date') {
        return 'Select date and time';
      }

      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        return 'Select date and time';
      }

      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'Select date and time';
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: containerPadding,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb'
          }}>
            <Pressable onPress={handleClose} disabled={isCreatingEvent}>
              <Feather name="x" size={24} color="#6b7280" />
            </Pressable>

            <Text style={{
              fontSize: titleFontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Create Event
            </Text>

            <TouchableOpacity
              onPress={handleCreateEvent}
              disabled={isCreatingEvent}
              style={{
                backgroundColor: isCreatingEvent ? '#9ca3af' : '#10b981',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8
              }}
            >
              <Text style={{
                color: 'white',
                fontWeight: '600',
                fontSize: fontSize
              }}>
                {isCreatingEvent ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <KeyboardAwareScrollView
            style={{ flex: 1, backgroundColor: '#fafafa' }}
            contentContainerStyle={{
              padding: containerPadding,
              paddingBottom: 20
            }}
            bottomOffset={80}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <View style={{ marginBottom: spacing + 4 }}>
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 10,
                letterSpacing: -0.3
              }}>
                Event Title *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: fontSize,
                  color: '#111827',
                  backgroundColor: 'white'
                }}
                placeholder="Enter event title"
                placeholderTextColor="#9ca3af"
                value={newEvent.title}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
                editable={!isCreatingEvent}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: spacing + 4 }}>
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 10,
                letterSpacing: -0.3
              }}>
                Description
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: fontSize,
                  color: '#111827',
                  minHeight: 100,
                  textAlignVertical: 'top',
                  backgroundColor: 'white'
                }}
                placeholder="Enter event description"
                placeholderTextColor="#9ca3af"
                value={newEvent.description}
                onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
                multiline
                editable={!isCreatingEvent}
              />
            </View>

            {/* Event Type */}
            <View style={{ marginBottom: spacing + 4 }}>
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 10,
                letterSpacing: -0.3
              }}>
                Event Type
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10
              }}>
                {eventTypes.map(type => {
                  const isSelected = newEvent.event_type_id === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => setNewEvent(prev => ({ ...prev, event_type_id: type.id }))}
                      disabled={isCreatingEvent}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? type.color : 'white',
                        borderWidth: 1.5,
                        borderColor: isSelected ? type.color : '#e5e7eb'
                      }}
                    >
                      <Text style={{
                        fontSize: fontSize - 1,
                        fontWeight: '600',
                        color: isSelected ? 'white' : '#374151',
                        letterSpacing: -0.2
                      }}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date & Time */}
            <View style={{ marginBottom: spacing + 4 }}>
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 10,
                letterSpacing: -0.3
              }}>
                Schedule
              </Text>
              <View style={{ gap: 12 }}>
                {/* Start Date & Time */}
                <View>
                  <Text style={{
                    fontSize: fontSize - 2,
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: 8
                  }}>
                    Start Date & Time *
                  </Text>
                  <Pressable
                    onPress={() => openCustomDatePicker('start')}
                    disabled={isCreatingEvent}
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#e5e7eb',
                      borderRadius: 12,
                      padding: 14,
                      backgroundColor: isCreatingEvent ? '#f9fafb' : 'white',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize,
                      color: newEvent.start_date ? '#111827' : '#9ca3af',
                      fontWeight: '500'
                    }}>
                      {formatDateTimeForDisplay(newEvent.start_date)}
                    </Text>
                    <Feather name="calendar" size={18} color="#6b7280" />
                  </Pressable>
                </View>

                {/* End Date & Time */}
                <View>
                  <Text style={{
                    fontSize: fontSize - 2,
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: 8
                  }}>
                    End Date & Time *
                  </Text>
                  <Pressable
                    onPress={() => openCustomDatePicker('end')}
                    disabled={isCreatingEvent}
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#e5e7eb',
                      borderRadius: 12,
                      padding: 14,
                      backgroundColor: isCreatingEvent ? '#f9fafb' : 'white',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize,
                      color: newEvent.end_date ? '#111827' : '#9ca3af',
                      fontWeight: '500'
                    }}>
                      {formatDateTimeForDisplay(newEvent.end_date)}
                    </Text>
                    <Feather name="calendar" size={18} color="#6b7280" />
                  </Pressable>
                </View>
              </View>

              {/* Quick time selection buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    const now = new Date();
                    const later = new Date(now.getTime() + 60 * 60 * 1000);
                    setNewEvent(prev => ({
                      ...prev,
                      start_date: format(now, "yyyy-MM-dd'T'HH:mm"),
                      end_date: format(later, "yyyy-MM-dd'T'HH:mm")
                    }));
                  }}
                  disabled={isCreatingEvent}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                  }}
                >
                  <Text style={{ fontSize: fontSize - 2, color: '#6b7280', fontWeight: '500' }}>
                    +1 Hour
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const now = new Date();
                    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                    setNewEvent(prev => ({
                      ...prev,
                      start_date: format(now, "yyyy-MM-dd'T'HH:mm"),
                      end_date: format(later, "yyyy-MM-dd'T'HH:mm")
                    }));
                  }}
                  disabled={isCreatingEvent}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                  }}
                >
                  <Text style={{ fontSize: fontSize - 2, color: '#6b7280', fontWeight: '500' }}>
                    +2 Hours
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    const endTomorrow = new Date(tomorrow);
                    endTomorrow.setHours(10, 0, 0, 0);
                    setNewEvent(prev => ({
                      ...prev,
                      start_date: format(tomorrow, "yyyy-MM-dd'T'HH:mm"),
                      end_date: format(endTomorrow, "yyyy-MM-dd'T'HH:mm")
                    }));
                  }}
                  disabled={isCreatingEvent}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                  }}
                >
                  <Text style={{ fontSize: fontSize - 2, color: '#6b7280', fontWeight: '500' }}>
                    Tomorrow 9AM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location & Max Participants */}
            <View style={{ marginBottom: spacing + 4 }}>
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 10,
                letterSpacing: -0.3
              }}>
                Details
              </Text>
              
              {/* Location */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: 8
                }}>
                  Location
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  backgroundColor: 'white',
                  paddingLeft: 14
                }}>
                  <Feather name="map-pin" size={18} color="#6b7280" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 14,
                      paddingLeft: 0,
                      fontSize: fontSize,
                      color: '#111827'
                    }}
                    placeholder="Enter event location"
                    placeholderTextColor="#9ca3af"
                    value={newEvent.location}
                    onChangeText={(text) => setNewEvent(prev => ({ ...prev, location: text }))}
                    editable={!isCreatingEvent}
                  />
                </View>
              </View>

              {/* Max Participants */}
              <View>
                <Text style={{
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: 8
                }}>
                  Max Participants
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  backgroundColor: 'white',
                  paddingLeft: 14
                }}>
                  <Feather name="users" size={18} color="#6b7280" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 14,
                      paddingLeft: 0,
                      fontSize: fontSize,
                      color: '#111827'
                    }}
                    placeholder="Leave empty for unlimited"
                    placeholderTextColor="#9ca3af"
                    value={newEvent.max_participants}
                    onChangeText={(text) => setNewEvent(prev => ({ ...prev, max_participants: text }))}
                    keyboardType="numeric"
                    editable={!isCreatingEvent}
                  />
                </View>
              </View>
            </View>

            {/* Athlete Participants */}
            <View style={{ marginBottom: spacing + 4 }}>
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '700',
                color: '#111827',
                marginBottom: 10,
                letterSpacing: -0.3
              }}>
                Select Athletes
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280',
                marginBottom: 12,
                fontWeight: '500'
              }}>
                Choose athletes to participate in this event
                {newEvent.participant_ids.length > 0 && (
                  <Text style={{ color: '#10b981', fontWeight: '600' }}>
                    {` (${newEvent.participant_ids.length} selected)`}
                  </Text>
                )}
              </Text>

              {enrolledAthletes.length === 0 ? (
                <View style={{
                  padding: 20,
                  backgroundColor: 'white',
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#e5e7eb',
                  alignItems: 'center'
                }}>
                  <Feather name="user-x" size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#9ca3af',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    No enrolled athletes found
                  </Text>
                  <Text style={{
                    fontSize: fontSize - 2,
                    color: '#d1d5db',
                    textAlign: 'center',
                    marginTop: 4
                  }}>
                    Athletes need to be enrolled first
                  </Text>
                </View>
              ) : (
                <View style={{
                  borderWidth: 1.5,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  maxHeight: 160,
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  flexShrink: 0
                }}>
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    {enrolledAthletes.map((athlete, index) => {
                      const isSelected = newEvent.participant_ids.includes(athlete.id);
                      return (
                        <TouchableOpacity
                          key={athlete.id}
                          onPress={() => {
                            setNewEvent(prev => ({
                              ...prev,
                              participant_ids: isSelected
                                ? prev.participant_ids.filter(id => id !== athlete.id)
                                : [...prev.participant_ids, athlete.id]
                            }));
                          }}
                          disabled={isCreatingEvent}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 14,
                            backgroundColor: isSelected ? '#f0fdf4' : 'white',
                            borderBottomWidth: index < enrolledAthletes.length - 1 ? 1 : 0,
                            borderBottomColor: '#f3f4f6'
                          }}
                        >
                          <View style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: isSelected ? '#10b981' : '#d1d5db',
                            backgroundColor: isSelected ? '#10b981' : 'white',
                            marginRight: 12,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            {isSelected && (
                              <Feather name="check" size={14} color="white" />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: fontSize,
                              color: '#111827',
                              fontWeight: isSelected ? '600' : '500'
                            }}>
                              {athlete.full_name}
                            </Text>
                          </View>
                          {isSelected && (
                            <Feather name="user-check" size={16} color="#10b981" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </KeyboardAwareScrollView>

          {/* Custom Date Picker Modal */}
          {showStartDatePicker && !showTimePicker && (
            <Modal
              visible={showStartDatePicker}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={cancelDatePicker}
            >
              <CustomCalendar
                selectedDate={tempSelectedDate}
                onDateSelect={handleDateSelection}
                onClose={cancelDatePicker}
                minDate={pickerMode === 'start' ? new Date() : new Date(newEvent.start_date)}
                events={events}
              />
            </Modal>
          )}

          {/* Custom Time Picker Modal */}
          {showTimePicker && (
            <Modal
              visible={showTimePicker}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={cancelDatePicker}
            >
              <CustomTimePicker
                selectedTime={tempSelectedTime}
                onTimeChange={setTempSelectedTime}
                onConfirm={handleTimeSelection}
                onClose={cancelDatePicker}
              />
            </Modal>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};