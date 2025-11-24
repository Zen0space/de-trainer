import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getWorkoutTemplates, deleteWorkoutTemplate } from '../../lib/api';
import { Card } from '../ui/Card';
import { useToast } from '../../contexts/ToastContext';

/**
 * WorkoutTemplateLibrary Component
 * 
 * Displays a list of workout templates for a trainer with search functionality.
 * Allows selecting templates for assignment, editing, or deletion.
 * 
 * Usage Example:
 * ```tsx
 * import { WorkoutTemplateLibrary } from '../../components/workout/WorkoutTemplateLibrary';
 * import { WorkoutAssignmentModal } from '../../components/workout/WorkoutAssignmentModal';
 * 
 * function MyScreen() {
 *   const { user } = useSession();
 *   const [selectedTemplate, setSelectedTemplate] = useState(null);
 *   const [showAssignmentModal, setShowAssignmentModal] = useState(false);
 *   const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);
 *   const [editTemplateId, setEditTemplateId] = useState(null);
 * 
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <WorkoutTemplateLibrary
 *         trainerId={user.id}
 *         onSelectTemplate={(template) => {
 *           setSelectedTemplate(template);
 *           setShowAssignmentModal(true);
 *         }}
 *         onEditTemplate={(templateId) => {
 *           setEditTemplateId(templateId);
 *           setShowWorkoutBuilder(true);
 *         }}
 *         onCreateNew={() => {
 *           setEditTemplateId(null);
 *           setShowWorkoutBuilder(true);
 *         }}
 *       />
 *       
 *       {showAssignmentModal && selectedTemplate && (
 *         <WorkoutAssignmentModal
 *           visible={showAssignmentModal}
 *           workoutTemplateId={selectedTemplate.id}
 *           workoutTemplateName={selectedTemplate.name}
 *           trainerId={user.id}
 *           onClose={() => setShowAssignmentModal(false)}
 *           onAssignSuccess={() => {
 *             setShowAssignmentModal(false);
 *             Alert.alert('Success', 'Workout assigned successfully');
 *           }}
 *         />
 *       )}
 *       
 *       {showWorkoutBuilder && (
 *         <WorkoutBuilderScreen
 *           templateId={editTemplateId}
 *           onBack={() => setShowWorkoutBuilder(false)}
 *         />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */

interface WorkoutTemplate {
  id: number;
  name: string;
  description: string | null;
  exercise_count: number;
  created_at: string;
  updated_at: string;
}

interface WorkoutTemplateLibraryProps {
  trainerId: number;
  onSelectTemplate: (template: WorkoutTemplate) => void;
  onEditTemplate: (templateId: number) => void;
  onCreateNew: () => void;
}

export function WorkoutTemplateLibrary({
  trainerId,
  onSelectTemplate,
  onEditTemplate,
  onCreateNew
}: WorkoutTemplateLibraryProps) {
  const { width } = useWindowDimensions();
  const { showSuccess, showError } = useToast();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : 16;
  
  // State
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkoutTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [trainerId]);
  
  // Filter templates when search changes
  useEffect(() => {
    filterTemplates();
  }, [searchQuery, templates]);
  
  const loadTemplates = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await getWorkoutTemplates(trainerId);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load workout templates');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const filterTemplates = () => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query))
    );
    
    setFilteredTemplates(filtered);
  };
  
  const handleDeleteTemplate = (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteWorkoutTemplate(template.id, trainerId);
              if (result.success) {
                // Remove from local state
                setTemplates((prev) => prev.filter((t) => t.id !== template.id));
                showSuccess('Template deleted successfully');
                Alert.alert('Success', 'Template deleted successfully');
              } else {
                showError(result.message);
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('Error deleting template:', error);
              showError('Failed to delete template');
              Alert.alert('Error', 'Failed to delete template');
            }
          }
        }
      ]
    );
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing
      }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{
          marginTop: 12,
          fontSize: fontSize,
          color: '#6b7280'
        }}>
          Loading templates...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={{
        padding: spacing,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12
        }}>
          <Feather name="search" size={18} color="#6b7280" />
          <TextInput
            placeholder="Search templates..."
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
        
        {/* Create New Button */}
        <Pressable
          onPress={onCreateNew}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#3b82f6',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8
          }}
        >
          <Feather name="plus" size={18} color="white" />
          <Text style={{
            marginLeft: 8,
            fontSize: fontSize,
            fontWeight: '600',
            color: 'white'
          }}>
            Create New Workout
          </Text>
        </Pressable>
      </View>
      
      {/* Templates List */}
      {templates.length === 0 ? (
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing
        }}>
          <Feather name="file-text" size={48} color="#9ca3af" />
          <Text style={{
            marginTop: 16,
            fontSize: fontSize + 2,
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center'
          }}>
            No workout templates yet
          </Text>
          <Text style={{
            marginTop: 8,
            fontSize: fontSize,
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Create your first workout template to get started
          </Text>
          
          <Pressable
            onPress={onCreateNew}
            style={{
              marginTop: 24,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#3b82f6',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 8
            }}
          >
            <Feather name="plus" size={18} color="white" />
            <Text style={{
              marginLeft: 8,
              fontSize: fontSize,
              fontWeight: '600',
              color: 'white'
            }}>
              Create Workout
            </Text>
          </Pressable>
        </View>
      ) : filteredTemplates.length === 0 ? (
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
            No templates found
          </Text>
          <Text style={{
            marginTop: 8,
            fontSize: fontSize,
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Try adjusting your search query
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
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
            </Text>
            
            {/* Template Cards */}
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                style={{
                  marginBottom: 12,
                  padding: 0,
                  overflow: 'hidden'
                }}
              >
                <Pressable
                  onPress={() => onSelectTemplate(template)}
                  style={{
                    padding: 16
                  }}
                >
                  {/* Template Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 8
                  }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{
                        fontSize: fontSize + 2,
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: 4
                      }}>
                        {template.name}
                      </Text>
                      
                      {template.description && (
                        <Text
                          style={{
                            fontSize: fontSize - 2,
                            color: '#6b7280',
                            marginBottom: 8
                          }}
                          numberOfLines={2}
                        >
                          {template.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Template Info */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 12
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Feather name="list" size={14} color="#6b7280" />
                      <Text style={{
                        marginLeft: 4,
                        fontSize: fontSize - 2,
                        color: '#6b7280'
                      }}>
                        {template.exercise_count} exercise{template.exercise_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Feather name="calendar" size={14} color="#6b7280" />
                      <Text style={{
                        marginLeft: 4,
                        fontSize: fontSize - 2,
                        color: '#6b7280'
                      }}>
                        {formatDate(template.created_at)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    paddingTop: 12,
                    marginTop: 4
                  }}>
                    <Pressable
                      onPress={() => onSelectTemplate(template)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#3b82f6',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 6
                      }}
                    >
                      <Feather name="send" size={16} color="white" />
                      <Text style={{
                        marginLeft: 6,
                        fontSize: fontSize - 2,
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        Assign
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={() => onEditTemplate(template.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f3f4f6',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#e5e7eb'
                      }}
                    >
                      <Feather name="edit-2" size={16} color="#6b7280" />
                      <Text style={{
                        marginLeft: 6,
                        fontSize: fontSize - 2,
                        fontWeight: '600',
                        color: '#6b7280'
                      }}>
                        Edit
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={() => handleDeleteTemplate(template)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fef2f2',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#fecaca'
                      }}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </Pressable>
              </Card>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
