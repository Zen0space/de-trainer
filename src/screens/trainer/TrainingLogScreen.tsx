import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Dropdown } from '../../components/ui/Dropdown';
import { tursoDbHelpers } from '../../lib/turso-database';
import { useKeyboardAware } from '../../hooks/useKeyboardAware';

// Types for the training log functionality
interface Athlete {
  id: number;
  full_name: string;
  email: string;
  sport: string;
  level: string;
}

interface FitnessComponent {
  id: number;
  name: string;
  description: string;
}

interface Test {
  id: number;
  component_id: number;
  name: string;
  unit: string;
  description: string;
  improvement_direction: 'higher' | 'lower';
}

interface FitnessLogEntry {
  athlete_id: number;
  test_id: number;
  result_value: number | null;
  result_text: string;
  notes: string;
  test_date: string;
  input_unit: string;
}

export function TrainingLogScreen() {
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

  // Keyboard-aware scrolling
  const { keyboardAvoidingViewProps, scrollViewProps } = useKeyboardAware({ containerPadding });

  // State management
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [fitnessComponents, setFitnessComponents] = useState<FitnessComponent[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<FitnessComponent | null>(null);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true);
  const [showLogEntry, setShowLogEntry] = useState(false);

  // Form state for fitness log entry
  const [logEntry, setLogEntry] = useState<FitnessLogEntry>({
    athlete_id: 0,
    test_id: 0,
    result_value: null,
    result_text: '',
    notes: '',
    test_date: new Date().toISOString().split('T')[0],
    input_unit: ''
  });



  // Fetch enrolled athletes and fitness data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoadingAthletes(true);
      try {


        // Query for athletes enrolled with this trainer
        const enrolledAthletes = await tursoDbHelpers.all(`
          SELECT 
            u.id,
            u.full_name,
            u.email,
            a.sport,
            a.level
          FROM enrollments e
          JOIN users u ON e.athlete_id = u.id
          JOIN athletes a ON a.user_id = u.id
          WHERE e.trainer_id = ? AND e.status = 'approved'
          ORDER BY u.full_name
        `, [user.id]);

        setAthletes(enrolledAthletes || []);

        // Fetch fitness components from database
        const components = await tursoDbHelpers.all(`
          SELECT id, name, description 
          FROM fitness_components 
          ORDER BY name
        `);

        // Fetch tests from database
        const testsData = await tursoDbHelpers.all(`
          SELECT t.id, t.component_id, t.name, t.unit, t.description, t.improvement_direction
          FROM tests t
          ORDER BY t.name
        `);

        setFitnessComponents(components || []);
        setTests(testsData || []);
      } catch (error) {
        console.error('❌ Error fetching enrolled athletes:', error);
        Alert.alert('Error', 'Failed to load enrolled athletes. Please try again.');
        setAthletes([]);
      } finally {
        setIsLoadingAthletes(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Filter tests based on selected fitness component
  useEffect(() => {
    if (selectedComponent && tests) {
      const filtered = tests.filter(test => test.component_id === selectedComponent.id);
      setFilteredTests(filtered);
    } else {
      setFilteredTests([]);
    }
  }, [selectedComponent, tests]);

  const handleAthleteSelect = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowLogEntry(true);
    setLogEntry(prev => ({ ...prev, athlete_id: athlete.id }));
  };

  const handleComponentSelect = (componentName: string) => {
    const component = fitnessComponents?.find(c => c.name === componentName) || null;
    setSelectedComponent(component);
    // Reset test selection when component changes
    setLogEntry(prev => ({ ...prev, test_id: 0, input_unit: '' }));
  };

  const handleTestSelect = (testName: string) => {
    const test = filteredTests?.find(t => t.name === testName);
    if (test) {
      setLogEntry(prev => ({ 
        ...prev, 
        test_id: test.id,
        input_unit: test.unit 
      }));
    }
  };

  const handleSubmitLog = async () => {
    if (!logEntry.test_id || (!logEntry.result_value && !logEntry.result_text)) {
      Alert.alert('Error', 'Please select a test and enter a result');
      return;
    }

    setIsLoading(true);
    try {

      
      // Check if this is a best record for this athlete and test
      const existingResults = await tursoDbHelpers.all(`
        SELECT result_value 
        FROM test_results 
        WHERE athlete_id = ? AND test_id = ? 
        ORDER BY result_value ${logEntry.result_value ? 'DESC' : 'ASC'}
      `, [logEntry.athlete_id, logEntry.test_id]);

      // Get test info to determine improvement direction
      const testInfo = tests.find(t => t.id === logEntry.test_id);
      let isBestRecord = false;

      if (logEntry.result_value && testInfo) {
        if (existingResults.length === 0) {
          // First record is always a best record
          isBestRecord = true;
        } else {
          const bestExisting = existingResults[0]?.result_value;
          if (testInfo.improvement_direction === 'higher') {
            isBestRecord = logEntry.result_value > bestExisting;
          } else {
            isBestRecord = logEntry.result_value < bestExisting;
          }
        }
      }

      // Save the test result
      const result = await tursoDbHelpers.run(`
        INSERT INTO test_results (
          athlete_id, 
          test_id, 
          result_value, 
          result_text, 
          notes, 
          test_date, 
          input_unit, 
          is_best_record
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        logEntry.athlete_id,
        logEntry.test_id,
        logEntry.result_value,
        logEntry.result_text || null,
        logEntry.notes || null,
        logEntry.test_date,
        logEntry.input_unit || null,
        isBestRecord
      ]);


      
      Alert.alert('Success', `Fitness log entry saved successfully!${isBestRecord ? ' 🏆 New personal best!' : ''}`, [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setLogEntry({
              athlete_id: selectedAthlete?.id || 0,
              test_id: 0,
              result_value: null,
              result_text: '',
              notes: '',
              test_date: new Date().toISOString().split('T')[0],
              input_unit: ''
            });
            setSelectedComponent(null);
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Error saving fitness log:', error);
      Alert.alert('Error', 'Failed to save fitness log entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (showLogEntry) {
      setShowLogEntry(false);
      setSelectedAthlete(null);
      setSelectedComponent(null);
    }
  };

  return (
    <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
      <ScrollView {...scrollViewProps}>
        <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
          
          {/* Header */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {showLogEntry && (
                <Pressable
                  onPress={goBack}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6',
                    marginRight: 12
                  }}
                >
                  <Feather name="arrow-left" size={20} color="#6b7280" />
                </Pressable>
              )}
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: titleFontSize,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 4
                }}>
                  {showLogEntry && selectedAthlete 
                    ? `${selectedAthlete.full_name} - Training Log`
                    : 'Training Log Management'
                  }
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  {showLogEntry 
                    ? 'Add fitness test results and notes'
                    : 'Select an athlete to add training logs'
                  }
                </Text>
              </View>
              
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#10b981',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather name="activity" size={20} color="white" />
              </View>
            </View>
          </View>

          {!showLogEntry ? (
            /* Athlete Selection */
            isLoadingAthletes ? (
              /* Loading State */
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding,
                borderRadius: 16,
                marginBottom: spacing,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200
              }}>
                <Feather name="loader" size={32} color="#6b7280" />
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginTop: 16,
                  textAlign: 'center'
                }}>
                  Loading your athletes...
                </Text>
              </View>
            ) : athletes.length > 0 ? (
              /* Athletes List */
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding,
                borderRadius: 16,
                marginBottom: spacing,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}>
                <Text style={{
                  fontSize: fontSize + 2,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 16
                }}>
                  Your Athletes ({athletes.length})
                </Text>
                
                {athletes.map((athlete) => (
                  <Pressable
                    key={athlete.id}
                    onPress={() => handleAthleteSelect(athlete)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#e5e7eb'
                    }}
                  >
                    <View style={{
                      width: 50,
                      height: 50,
                      backgroundColor: '#3b82f6',
                      borderRadius: 25,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 16
                    }}>
                      <Text style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>
                        {athlete.full_name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: 2
                      }}>
                        {athlete.full_name}
                      </Text>
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: '#6b7280',
                        marginBottom: 2
                      }}>
                        {athlete.email}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{
                          fontSize: fontSize - 2,
                          color: '#10b981',
                          fontWeight: '600',
                          backgroundColor: '#f0fdf4',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginRight: 8
                        }}>
                          {athlete.sport}
                        </Text>
                        <Text style={{
                          fontSize: fontSize - 2,
                          color: '#f59e0b',
                          fontWeight: '600',
                          backgroundColor: '#fefbf2',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6
                        }}>
                          {athlete.level}
                        </Text>
                      </View>
                    </View>
                    
                    <Feather name="chevron-right" size={20} color="#6b7280" />
                  </Pressable>
                ))}
              </View>
            ) : (
              /* No Athletes Message */
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding,
                borderRadius: 16,
                marginBottom: spacing,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300
              }}>
                <View style={{
                  width: 80,
                  height: 80,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24
                }}>
                  <Feather name="users" size={36} color="#9ca3af" />
                </View>
                
                <Text style={{
                  fontSize: fontSize + 4,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  No Athletes Yet
                </Text>
                
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: 24,
                  marginBottom: 24,
                  maxWidth: 280
                }}>
                  You don't have any enrolled athletes yet. Athletes can send you enrollment requests to start training with you.
                </Text>
                
                <View style={{
                  backgroundColor: '#f0f9ff',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e0f2fe',
                  maxWidth: 320
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="info" size={16} color="#0284c7" />
                    <Text style={{
                      fontSize: fontSize - 1,
                      fontWeight: '600',
                      color: '#0284c7',
                      marginLeft: 8
                    }}>
                      How it works
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize - 2,
                    color: '#0369a1',
                    lineHeight: 20
                  }}>
                    Athletes can find and request to enroll with you. Once you accept their requests, they'll appear here and you can start logging their training data.
                  </Text>
                </View>
              </View>
            )
          ) : (
            /* Fitness Log Entry Form */
            fitnessComponents.length > 0 ? (
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 16,
              marginBottom: spacing,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 16
              }}>
                Add Fitness Log Entry
              </Text>
              
              {/* Fitness Component Selection */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Fitness Component
                </Text>
                                  <Dropdown
                    placeholder="Select fitness component"
                    value={selectedComponent?.name || ''}
                    onSelect={handleComponentSelect}
                    options={fitnessComponents?.map(c => ({ label: c.name, value: c.name })) || []}
                  />
              </View>

              {/* Test Selection */}
              {selectedComponent && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 8
                  }}>
                    Test Name
                  </Text>
                  <Dropdown
                    placeholder="Select test"
                    value={filteredTests?.find(t => t.id === logEntry.test_id)?.name || ''}
                    onSelect={handleTestSelect}
                    options={filteredTests?.map(t => ({ label: `${t.name} (${t.unit})`, value: t.name })) || []}
                  />
                </View>
              )}

              {/* Test Result */}
              {logEntry.test_id > 0 && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: 8
                    }}>
                      Test Result {logEntry.input_unit && `(${logEntry.input_unit})`}
                    </Text>
                    <Input
                      placeholder={`Enter result in ${logEntry.input_unit}`}
                      value={logEntry.result_text}
                      onChangeText={(text) => {
                        setLogEntry(prev => ({ 
                          ...prev, 
                          result_text: text,
                          result_value: isNaN(Number(text)) ? null : Number(text)
                        }));
                      }}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Test Date */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: 8
                    }}>
                      Test Date
                    </Text>
                    <Input
                      placeholder="YYYY-MM-DD"
                      value={logEntry.test_date}
                      onChangeText={(text) => setLogEntry(prev => ({ ...prev, test_date: text }))}
                    />
                  </View>

                  {/* Notes */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: 8
                    }}>
                      Notes (Optional)
                    </Text>
                    <Input
                      placeholder="Add any additional notes or observations..."
                      value={logEntry.notes}
                      onChangeText={(text) => setLogEntry(prev => ({ ...prev, notes: text }))}
                      multiline
                    />
                  </View>

                  {/* Submit Button */}
                  <Button
                    title={isLoading ? "Saving..." : "Save Fitness Log"}
                    onPress={handleSubmitLog}
                    disabled={isLoading}
                  />
                </>
              )}
            </View>
            ) : null
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
