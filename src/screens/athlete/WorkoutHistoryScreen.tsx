import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { tursoDbHelpers } from '../../lib/turso-database';

interface TestResult {
  id: number;
  test_id: number;
  test_name: string;
  component_name: string;
  result_value: number | null;
  result_text: string;
  input_unit: string;
  notes: string | null;
  test_date: string;
  created_at: string;
  is_best_record: boolean;
  improvement_direction: 'higher' | 'lower';
}

interface FitnessComponent {
  id: number;
  name: string;
  description: string;
  test_count: number;
}

export function WorkoutHistoryScreen() {
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

  // State management
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [fitnessComponents, setFitnessComponents] = useState<FitnessComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<FitnessComponent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch test results and components
  const fetchData = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch all test results for the athlete
      const results = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.test_id,
          t.name as test_name,
          fc.name as component_name,
          tr.result_value,
          tr.result_text,
          tr.input_unit,
          tr.notes,
          tr.test_date,
          tr.created_at,
          tr.is_best_record,
          t.improvement_direction
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        JOIN fitness_components fc ON t.component_id = fc.id
        WHERE tr.athlete_id = ?
        ORDER BY tr.test_date DESC, tr.created_at DESC
      `, [user.id]);

      console.log('📊 Test results:', results);
      setTestResults(results || []);

      // Fetch fitness components with test counts
      const components = await tursoDbHelpers.all(`
        SELECT 
          fc.id,
          fc.name,
          fc.description,
          COUNT(DISTINCT tr.id) as test_count
        FROM fitness_components fc
        LEFT JOIN tests t ON fc.id = t.component_id
        LEFT JOIN test_results tr ON t.id = tr.test_id AND tr.athlete_id = ?
        GROUP BY fc.id, fc.name, fc.description
        HAVING test_count > 0
        ORDER BY fc.name
      `, [user.id]);

      console.log('🏋️ Fitness components:', components);
      setFitnessComponents(components || []);

    } catch (error) {
      console.error('❌ Error fetching test results:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Handle refresh
  const onRefresh = () => {
    fetchData(true);
  };

  // Filter results by selected component
  const filteredResults = selectedComponent 
    ? testResults.filter(result => result.component_name === selectedComponent.name)
    : testResults;

  // Get stats for dashboard
  const getStats = () => {
    const totalTests = testResults.length;
    const personalRecords = testResults.filter(r => r.is_best_record).length;
    const recentTests = testResults.filter(r => {
      const testDate = new Date(r.test_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return testDate >= thirtyDaysAgo;
    }).length;
    const uniqueTestTypes = new Set(testResults.map(r => r.test_name)).size;

    return { totalTests, personalRecords, recentTests, uniqueTestTypes };
  };

  const stats = getStats();

  const ComponentCard = ({ component, isSelected, onPress }: {
    component: FitnessComponent;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: isSelected ? '#3b82f6' : 'white',
        padding: cardPadding,
        borderRadius: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
        minWidth: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{
        fontSize: fontSize,
        fontWeight: '600',
        color: isSelected ? 'white' : '#1f2937',
        marginBottom: 4
      }}>
        {component.name}
      </Text>
      <Text style={{
        fontSize: fontSize - 2,
        color: isSelected ? 'rgba(255,255,255,0.8)' : '#6b7280'
      }}>
        {component.test_count} test{component.test_count !== 1 ? 's' : ''}
      </Text>
    </Pressable>
  );

  const TestResultCard = ({ result }: { result: TestResult }) => (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding,
      borderRadius: 12,
      marginBottom: spacing,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderLeftWidth: result.is_best_record ? 4 : 0,
      borderLeftColor: result.is_best_record ? '#f59e0b' : 'transparent',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{
              fontSize: fontSize,
              fontWeight: '600',
              color: '#1f2937',
              flex: 1
            }}>
              {result.test_name}
            </Text>
            {result.is_best_record && (
              <View style={{
                backgroundColor: '#fef3c7',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Feather name="award" size={12} color="#f59e0b" />
                <Text style={{
                  fontSize: fontSize - 3,
                  color: '#f59e0b',
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  PR
                </Text>
              </View>
            )}
          </View>
          
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            marginBottom: 8
          }}>
            {result.component_name}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{
              backgroundColor: '#f0fdf4',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              marginRight: 12
            }}>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#10b981'
              }}>
                {result.result_text}
              </Text>
            </View>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280'
            }}>
              {result.input_unit}
            </Text>
          </View>
          
          {result.notes && (
            <View style={{
              backgroundColor: '#f8fafc',
              padding: 12,
              borderRadius: 8,
              marginBottom: 8
            }}>
              <Text style={{
                fontSize: fontSize - 1,
                color: '#374151',
                fontStyle: 'italic'
              }}>
                "{result.notes}"
              </Text>
            </View>
          )}
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#9ca3af'
            }}>
              {new Date(result.test_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather 
                name={result.improvement_direction === 'higher' ? 'trending-up' : 'trending-down'} 
                size={14} 
                color="#6b7280" 
              />
              <Text style={{
                fontSize: fontSize - 3,
                color: '#6b7280',
                marginLeft: 4
              }}>
                {result.improvement_direction === 'higher' ? 'Higher is better' : 'Lower is better'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const EmptyState = ({ title, description, icon }: {
    title: string;
    description: string;
    icon: string;
  }) => (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding * 2,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
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
        <Feather name={icon as any} size={36} color="#9ca3af" />
      </View>
      
      <Text style={{
        fontSize: fontSize + 4,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
        textAlign: 'center'
      }}>
        {title}
      </Text>
      
      <Text style={{
        fontSize: fontSize,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 280
      }}>
        {description}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: containerPadding,
          paddingBottom: containerPadding + 100 
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
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
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: titleFontSize,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 4
                }}>
                  Workout History
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  Track your fitness progress over time
                </Text>
              </View>
              
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#f59e0b',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather name="activity" size={20} color="white" />
              </View>
            </View>
          </View>

          {isLoading ? (
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
                Loading your workout history...
              </Text>
            </View>
          ) : testResults.length > 0 ? (
            <>
              {/* Stats Cards */}
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: spacing,
                gap: spacing / 2
              }}>
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#3b82f6', marginBottom: 4 }}>
                      {stats.totalTests}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Total Tests</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 }}>
                      {stats.personalRecords}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Personal Records</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#10b981', marginBottom: 4 }}>
                      {stats.recentTests}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Recent (30d)</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 4 }}>
                      {stats.uniqueTestTypes}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Test Types</Text>
                  </View>
                </View>
              </View>

              {/* Fitness Components Filter */}
              {fitnessComponents.length > 0 && (
                <View style={{ marginBottom: spacing }}>
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 12,
                    paddingHorizontal: 4
                  }}>
                    Filter by Component
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    <ComponentCard
                      component={{ id: 0, name: 'All Tests', description: '', test_count: testResults.length }}
                      isSelected={!selectedComponent}
                      onPress={() => setSelectedComponent(null)}
                    />
                    {fitnessComponents.map((component) => (
                      <ComponentCard
                        key={component.id}
                        component={component}
                        isSelected={selectedComponent?.id === component.id}
                        onPress={() => setSelectedComponent(component)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Test Results List */}
              <View>
                <Text style={{
                  fontSize: fontSize + 2,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 16,
                  paddingHorizontal: 4
                }}>
                  {selectedComponent ? `${selectedComponent.name} Results` : 'All Test Results'} ({filteredResults.length})
                </Text>
                
                {filteredResults.map((result) => (
                  <TestResultCard key={result.id} result={result} />
                ))}
              </View>
            </>
          ) : (
            /* Empty State */
            <EmptyState
              icon="activity"
              title="No Test Results Yet"
              description="Your trainer hasn't added any fitness test results yet. Once they start tracking your progress, your results will appear here."
            />
          )}

        </View>
      </ScrollView>
    </View>
  );
}
