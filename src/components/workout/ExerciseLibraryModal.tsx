import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExercises } from '../../lib/api';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
}

interface ExerciseLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const MUSCLE_GROUPS = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'chest', label: 'Chest', icon: 'heart' },
  { id: 'legs', label: 'Legs', icon: 'trending-up' },
  { id: 'back', label: 'Back', icon: 'shield' },
  { id: 'shoulders', label: 'Shoulders', icon: 'triangle' },
  { id: 'arms', label: 'Arms', icon: 'zap' },
  { id: 'core', label: 'Core', icon: 'circle' }
];

export function ExerciseLibraryModal({
  visible,
  onClose,
  onSelectExercise
}: ExerciseLibraryModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : 16;
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load exercises on mount
  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible]);
  
  // Filter exercises when search or category changes
  useEffect(() => {
    filterExercises();
  }, [searchQuery, selectedCategory, exercises]);
  
  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const allExercises = await getExercises();
      setExercises(allExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterExercises = () => {
    let filtered = exercises;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (ex) => ex.muscle_group.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.muscle_group.toLowerCase().includes(query)
      );
    }
    
    setFilteredExercises(filtered);
  };
  
  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise);
    // Reset state
    setSearchQuery('');
    setSelectedCategory('all');
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: spacing
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <Text style={{
              fontSize: isSmallScreen ? 20 : 24,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Exercise Library
            </Text>
            
            <Pressable
              onPress={onClose}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#f3f3f3'
              }}
            >
              <Feather name="x" size={20} color="#1f2937" />
            </Pressable>
          </View>
          
          {/* Search Bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f3f3f3',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
            <Feather name="search" size={18} color="#6b7280" />
            <TextInput
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: fontSize,
                color: '#1f2937'
              }}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Feather name="x-circle" size={18} color="#6b7280" />
              </Pressable>
            )}
          </View>
        </View>
        
        {/* Muscle Group Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing,
            paddingVertical: 12,
            gap: 8
          }}
          style={{
            backgroundColor: '#f9fafb',
            maxHeight: 60
          }}
        >
          {MUSCLE_GROUPS.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => setSelectedCategory(group.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  selectedCategory === group.id ? '#3b82f6' : 'white',
                borderWidth: 1,
                borderColor:
                  selectedCategory === group.id ? '#3b82f6' : '#e5e7eb'
              }}
            >
              <Feather
                name={group.icon as any}
                size={14}
                color={selectedCategory === group.id ? 'white' : '#6b7280'}
              />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  color: selectedCategory === group.id ? 'white' : '#6b7280'
                }}
              >
                {group.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        
        {/* Exercise List */}
        {isLoading ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{
              marginTop: 12,
              fontSize: fontSize,
              color: '#6b7280'
            }}>
              Loading exercises...
            </Text>
          </View>
        ) : filteredExercises.length === 0 ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing
          }}>
            <Feather name="search" size={48} color="#9ca3af" />
            <Text style={{
              marginTop: 16,
              fontSize: fontSize + 2,
              fontWeight: '600',
              color: '#1f2937',
              textAlign: 'center'
            }}>
              No exercises found
            </Text>
            <Text style={{
              marginTop: 8,
              fontSize: fontSize,
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Try adjusting your search or filter
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: spacing,
              paddingBottom: 32
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{
              maxWidth: isTablet ? 800 : 600,
              alignSelf: 'center',
              width: '100%'
            }}>
              {/* Results count */}
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280',
                marginBottom: 12
              }}>
                {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
              </Text>
              
              {/* Exercise Cards */}
              {filteredExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => handleSelectExercise(exercise)}
                  style={{
                    backgroundColor: 'white',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: 6
                    }}>
                      {exercise.name}
                    </Text>
                    
                    <View style={{
                      backgroundColor: '#dbeafe',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: 'flex-start'
                    }}>
                      <Text style={{
                        fontSize: fontSize - 3,
                        color: '#3b82f6',
                        fontWeight: '600'
                      }}>
                        {exercise.muscle_group.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    width: 32,
                    height: 32,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Feather name="plus" size={18} color="#3b82f6" />
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
