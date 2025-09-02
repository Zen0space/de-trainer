import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, KeyboardAvoidingView, RefreshControl, Dimensions } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryBar, VictoryArea, VictoryAxis } from 'victory-native';
import { tursoDbHelpers } from '../../lib/turso-database';
import { useKeyboardAware } from '../../hooks/useKeyboardAware';

// Types for the athlete detail report
interface Athlete {
  id: number;
  full_name: string;
  email: string;
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrollment_date: string;
}

interface TestResult {
  id: number;
  test_id: number;
  test_name: string;
  fitness_component: string;
  result_value: number | null;
  result_text: string;
  unit: string;
  improvement_direction: 'higher' | 'lower';
  test_date: string;
  notes: string | null;
  is_best_record: boolean;
}

interface PerformanceStats {
  total_tests: number;
  best_records: number;
  avg_improvement: number;
  consistency_score: number;
  recent_activity: number;
}

interface FitnessComponentProgress {
  component_name: string;
  component_id: number;
  total_tests: number;
  best_record: TestResult | null;
  recent_tests: TestResult[];
  improvement_trend: 'improving' | 'declining' | 'stable';
}

interface AthleteDetailReportScreenProps {
  athleteId: number;
  onBack: () => void;
}

export function AthleteDetailReportScreen({ athleteId, onBack }: AthleteDetailReportScreenProps) {
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
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [bestRecords, setBestRecords] = useState<TestResult[]>([]);
  const [fitnessProgress, setFitnessProgress] = useState<FitnessComponentProgress[]>([]);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch athlete data
  useEffect(() => {
    fetchAthleteData();
  }, [athleteId, selectedTimeRange]);

  const fetchAthleteData = async (showRefreshing = false) => {
    if (!user?.id || !athleteId) return;

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch athlete basic info
      const athleteInfo = await tursoDbHelpers.get(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          a.sport,
          a.level,
          e.requested_at as enrollment_date
        FROM users u
        JOIN athletes a ON a.user_id = u.id
        JOIN enrollments e ON e.athlete_id = u.id
        WHERE u.id = ? AND e.trainer_id = ? AND e.status = 'approved'
      `, [athleteId, user.id]);

      if (!athleteInfo) {
        Alert.alert('Error', 'Athlete not found or not enrolled with you.');
        onBack();
        return;
      }

      setAthlete(athleteInfo);

      // Calculate date filter based on selected range
      const now = new Date();
      let dateFilter = '';
      if (selectedTimeRange !== '1y') {
        const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        dateFilter = ` AND tr.test_date >= '${startDate.toISOString().split('T')[0]}'`;
      }

      // Fetch performance statistics
      const stats = await tursoDbHelpers.get(`
        SELECT 
          COUNT(*) as total_tests,
          SUM(CASE WHEN tr.is_best_record = 1 THEN 1 ELSE 0 END) as best_records,
          SUM(CASE WHEN tr.test_date >= date('now', '-7 days') THEN 1 ELSE 0 END) as recent_activity
        FROM test_results tr
        WHERE tr.athlete_id = ?${dateFilter}
      `, [athleteId]);

      setPerformanceStats({
        total_tests: stats?.total_tests || 0,
        best_records: stats?.best_records || 0,
        avg_improvement: 0, // TODO: Calculate actual improvement
        consistency_score: 85, // TODO: Calculate actual consistency
        recent_activity: stats?.recent_activity || 0
      });

      // Fetch recent test results
      const recent = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.test_id,
          t.name as test_name,
          fc.name as fitness_component,
          tr.result_value,
          tr.result_text,
          t.unit,
          t.improvement_direction,
          tr.test_date,
          tr.notes,
          tr.is_best_record
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        JOIN fitness_components fc ON t.component_id = fc.id
        WHERE tr.athlete_id = ?${dateFilter}
        ORDER BY tr.test_date DESC, tr.created_at DESC
        LIMIT 10
      `, [athleteId]);

      setRecentTests(recent || []);

      // Fetch best records
      const records = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.test_id,
          t.name as test_name,
          fc.name as fitness_component,
          tr.result_value,
          tr.result_text,
          t.unit,
          t.improvement_direction,
          tr.test_date,
          tr.notes,
          tr.is_best_record
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        JOIN fitness_components fc ON t.component_id = fc.id
        WHERE tr.athlete_id = ? AND tr.is_best_record = 1
        ORDER BY tr.test_date DESC
        LIMIT 8
      `, [athleteId]);

      setBestRecords(records || []);

      // Fetch test history for charts
      const history = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.test_id,
          t.name as test_name,
          fc.name as fitness_component,
          tr.result_value,
          tr.result_text,
          t.unit,
          t.improvement_direction,
          tr.test_date,
          tr.notes,
          tr.is_best_record
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        JOIN fitness_components fc ON t.component_id = fc.id
        WHERE tr.athlete_id = ?${dateFilter}
        ORDER BY tr.test_date ASC
      `, [athleteId]);

      setTestHistory(history || []);

      // Fetch fitness component progress
      const progress = await tursoDbHelpers.all(`
        SELECT 
          fc.id as component_id,
          fc.name as component_name,
          COUNT(tr.id) as total_tests,
          MAX(tr.test_date) as last_test_date
        FROM fitness_components fc
        JOIN tests t ON fc.id = t.component_id
        LEFT JOIN test_results tr ON t.id = tr.test_id AND tr.athlete_id = ?${dateFilter}
        GROUP BY fc.id, fc.name
        HAVING COUNT(tr.id) > 0
        ORDER BY total_tests DESC, component_name
      `, [athleteId]);

      setFitnessProgress((progress || []).map((p: any) => ({
        component_name: p.component_name,
        component_id: p.component_id,
        total_tests: p.total_tests,
        best_record: null, // Will be populated separately if needed
        recent_tests: [],
        improvement_trend: 'stable' as const
      })));

    } catch (error) {
      console.error('❌ Error fetching athlete data:', error);
      Alert.alert('Error', 'Failed to load athlete data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatResult = (result: TestResult) => {
    if (result.result_value !== null) {
      return `${result.result_value} ${result.unit}`;
    }
    return result.result_text || 'N/A';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPerformanceColor = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Helper function to normalize test results to 0-100 scale for averaging
  const normalizeTestResult = (result: TestResult): number => {
    if (result.result_value !== null) {
      // For numerical results, we'll use a simple normalization
      // This is a simplified approach - in a real app, you'd have test-specific normalization
      const value = result.result_value;
      
      // Different normalization based on improvement direction
      if (result.improvement_direction === 'higher') {
        // For tests where higher is better (e.g., strength, speed)
        return Math.min(Math.max((value / 100) * 100, 0), 100);
      } else {
        // For tests where lower is better (e.g., time-based tests)
        return Math.min(Math.max((100 - (value / 10)) * 10, 0), 100);
      }
    } else {
      // For text results, assign scores based on common fitness test results
      const text = result.result_text?.toLowerCase() || '';
      if (text.includes('excellent') || text.includes('superior')) return 90;
      if (text.includes('good') || text.includes('above average')) return 75;
      if (text.includes('average') || text.includes('fair')) return 60;
      if (text.includes('below') || text.includes('poor')) return 40;
      if (text.includes('very poor')) return 20;
      return 50; // Default for unknown text results
    }
  };

  // Helper function to group tests by time periods and calculate averages
  const calculatePerformanceAverages = (tests: TestResult[]) => {
    if (tests.length === 0) return [];

    // Determine grouping period based on time range
    const groupBy = selectedTimeRange === '7d' ? 'day' : 
                   selectedTimeRange === '30d' ? 'week' : 
                   selectedTimeRange === '90d' ? 'week' : 'month';

    // Group tests by time period
    const groups: { [key: string]: TestResult[] } = {};
    
    tests.forEach(test => {
      const date = new Date(test.test_date);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(test);
    });

    // Calculate averages for each group
    const averages = Object.entries(groups)
      .map(([period, periodTests]) => {
        const normalizedScores = periodTests.map(normalizeTestResult);
        const average = normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length;
        
        return {
          period,
          average: Math.round(average * 10) / 10, // Round to 1 decimal place
          testCount: periodTests.length,
          date: new Date(periodTests[0].test_date) // Use first test date for sorting
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return averages;
  };

  // Helper function to calculate moving average
  const calculateMovingAverage = (data: number[], windowSize: number = 3): number[] => {
    if (data.length < windowSize) return data;
    
    const movingAverages: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        // For early points, use available data
        const slice = data.slice(0, i + 1);
        movingAverages.push(slice.reduce((sum, val) => sum + val, 0) / slice.length);
      } else {
        // Calculate moving average for window
        const slice = data.slice(i - windowSize + 1, i + 1);
        movingAverages.push(slice.reduce((sum, val) => sum + val, 0) / slice.length);
      }
    }
    
    return movingAverages;
  };

  // Helper function to format period labels
  const formatPeriodLabel = (period: string, groupBy: string): string => {
    if (groupBy === 'day') {
      return new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (groupBy === 'week') {
      const date = new Date(period);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else { // month
      const [year, month] = period.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Feather name="loader" size={32} color="#6b7280" />
        <Text style={{ fontSize: fontSize, color: '#6b7280', marginTop: 16 }}>
          Loading athlete report...
        </Text>
      </View>
    );
  }

  if (!athlete) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: containerPadding }}>
        <Feather name="user-x" size={48} color="#ef4444" />
        <Text style={{ fontSize: fontSize + 2, fontWeight: 'bold', color: '#1f2937', marginTop: 16, marginBottom: 8 }}>
          Athlete Not Found
        </Text>
        <Text style={{ fontSize: fontSize, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          This athlete is not enrolled with you or doesn't exist.
        </Text>
        <Pressable
          onPress={onBack}
          style={{
            backgroundColor: '#3b82f6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <Feather name="arrow-left" size={16} color="white" />
          <Text style={{ color: 'white', fontSize: fontSize, fontWeight: '600', marginLeft: 8 }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
        <ScrollView
          {...scrollViewProps}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchAthleteData(true)}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
        >
          <View style={{ maxWidth: isTablet ? 1000 : 600, alignSelf: 'center', width: '100%' }}>
            
            {/* Header with Athlete Profile */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Pressable
                  onPress={onBack}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6',
                    marginRight: 16
                  }}
                >
                  <Feather name="arrow-left" size={20} color="#6b7280" />
                </Pressable>
                
                {/* Profile Avatar */}
                <View style={{
                  width: 70,
                  height: 70,
                  backgroundColor: getLevelColor(athlete.level),
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <Text style={{
                    fontSize: fontSize + 8,
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {getInitials(athlete.full_name)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: titleFontSize,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 4
                  }}>
                    {athlete.full_name}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: fontSize - 1, marginBottom: 4 }}>
                    {athlete.email}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      backgroundColor: getLevelColor(athlete.level) + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      marginRight: 8
                    }}>
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: getLevelColor(athlete.level),
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {athlete.level}
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#9ca3af',
                      fontWeight: '500'
                    }}>
                      {athlete.sport}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Time Range Selector */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                  <Pressable
                    key={range}
                    onPress={() => setSelectedTimeRange(range)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: selectedTimeRange === range ? '#3b82f6' : '#f3f4f6',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize - 2,
                      fontWeight: '600',
                      color: selectedTimeRange === range ? 'white' : '#6b7280'
                    }}>
                      {range === '7d' ? '7 Days' : 
                       range === '30d' ? '30 Days' :
                       range === '90d' ? '90 Days' : '1 Year'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Performance Overview Cards */}
            {performanceStats && (
              <View style={{ 
                flexDirection: isSmallScreen ? 'column' : 'row', 
                gap: spacing,
                marginBottom: spacing 
              }}>
                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="activity" size={20} color="#3b82f6" />
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280',
                      marginLeft: 8,
                      fontWeight: '600'
                    }}>
                      Total Tests
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize + 8,
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {performanceStats.total_tests}
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="award" size={20} color="#10b981" />
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280',
                      marginLeft: 8,
                      fontWeight: '600'
                    }}>
                      Best Records
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize + 8,
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {performanceStats.best_records}
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="trending-up" size={20} color="#10b981" />
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280',
                      marginLeft: 8,
                      fontWeight: '600'
                    }}>
                      Consistency
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize + 8,
                    fontWeight: 'bold',
                    color: getPerformanceColor(performanceStats.consistency_score)
                  }}>
                    {performanceStats.consistency_score}%
                  </Text>
                </View>
              </View>
            )}

            {/* Performance Progress Chart */}
            {testHistory.length > 0 && (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="bar-chart-2" size={20} color="#6366f1" />
                    <Text style={{
                      fontSize: fontSize + 2,
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginLeft: 8
                    }}>
                      Performance Averages
                    </Text>
                  </View>
                  
                  <View style={{
                    backgroundColor: '#f0f9ff',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#3b82f6'
                  }}>
                    <Text style={{
                      fontSize: fontSize - 3,
                      color: '#1d4ed8',
                      fontWeight: '600'
                    }}>
                      {selectedTimeRange === '7d' ? 'DAILY AVG' : 
                       selectedTimeRange === '30d' || selectedTimeRange === '90d' ? 'WEEKLY AVG' : 'MONTHLY AVG'}
                    </Text>
                  </View>
                </View>
                
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280',
                  marginBottom: 12,
                  lineHeight: 18
                }}>
                  Shows normalized performance scores (0-100) with 3-period moving average for smoother trend analysis.
                </Text>
                
                {/* Line Chart for Performance Averages */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(() => {
                    const performanceAverages = calculatePerformanceAverages(testHistory);
                    const groupBy = selectedTimeRange === '7d' ? 'day' : 
                                   selectedTimeRange === '30d' ? 'week' : 
                                   selectedTimeRange === '90d' ? 'week' : 'month';
                    
                    if (performanceAverages.length === 0) {
                      return (
                        <View style={{
                          height: 220,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: '#e5e7eb',
                          borderStyle: 'dashed'
                        }}>
                          <Feather name="trending-up" size={32} color="#9ca3af" />
                          <Text style={{
                            fontSize: fontSize,
                            color: '#6b7280',
                            marginTop: 8,
                            textAlign: 'center'
                          }}>
                            Not enough data for averages
                          </Text>
                        </View>
                      );
                    }

                    // Calculate moving averages for smoother trend line
                    const rawAverages = performanceAverages.map(p => p.average);
                    const movingAverages = calculateMovingAverage(rawAverages, 3);
                    
                    const chartData = performanceAverages.slice(-8).map((avg, index) => ({
                      x: index + 1,
                      y: movingAverages.slice(-8)[index],
                      label: formatPeriodLabel(avg.period, groupBy)
                    }));

                    return (
                      <VictoryChart
                        width={Math.max(width - (containerPadding * 4), 300)}
                        height={220}
                        padding={{ left: 60, top: 20, right: 40, bottom: 60 }}
                      >
                        <VictoryAxis
                          dependentAxis
                          tickFormat={(t) => `${t.toFixed(1)}`}
                          style={{
                            axis: { stroke: '#e5e7eb' },
                            tickLabels: { fontSize: 12, fill: '#6b7280' },
                            grid: { stroke: '#f3f4f6' }
                          }}
                        />
                        <VictoryAxis
                          tickFormat={() => ''}
                          style={{
                            axis: { stroke: '#e5e7eb' },
                            tickLabels: { fontSize: 12, fill: '#6b7280' }
                          }}
                        />
                        <VictoryLine
                          data={chartData}
                          style={{
                            data: { stroke: '#3b82f6', strokeWidth: 3 }
                          }}
                          animate={{
                            duration: 1000,
                            onLoad: { duration: 500 }
                          }}
                        />
                      </VictoryChart>
                    );
                  })()}
                </ScrollView>
              </View>
            )}

            {/* Fitness Components Chart */}
            {fitnessProgress.length > 0 && (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Feather name="pie-chart" size={20} color="#8b5cf6" />
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginLeft: 8
                  }}>
                    Fitness Components Distribution
                  </Text>
                </View>

                {/* Bar Chart for Components */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(() => {
                    const barData = fitnessProgress.slice(0, 6).map((comp, index) => ({
                      x: index + 1,
                      y: comp.total_tests,
                      label: comp.component_name.length > 8 
                        ? comp.component_name.substring(0, 8) + '...'
                        : comp.component_name
                    }));

                    return (
                      <VictoryChart
                        width={Math.max(width - (containerPadding * 4), 300)}
                        height={220}
                        padding={{ left: 60, top: 20, right: 40, bottom: 80 }}
                        domainPadding={20}
                      >
                        <VictoryAxis
                          dependentAxis
                          tickFormat={(t) => `${Math.floor(t)}`}
                          style={{
                            axis: { stroke: '#e5e7eb' },
                            tickLabels: { fontSize: 12, fill: '#6b7280' },
                            grid: { stroke: '#f3f4f6' }
                          }}
                        />
                        <VictoryAxis
                          tickFormat={(x, index) => barData[index - 1]?.label || ''}
                          style={{
                            axis: { stroke: '#e5e7eb' },
                            tickLabels: { fontSize: 10, fill: '#6b7280', angle: -45, textAnchor: 'end' }
                          }}
                        />
                        <VictoryBar
                          data={barData}
                          style={{
                            data: { fill: '#8b5cf6' }
                          }}
                          animate={{
                            duration: 1000,
                            onLoad: { duration: 500 }
                          }}
                        />
                      </VictoryChart>
                    );
                  })()}
                </ScrollView>
              </View>
            )}



            {/* Recent Test Results */}
            {recentTests.length > 0 && (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Feather name="clock" size={20} color="#10b981" />
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginLeft: 8
                  }}>
                    Recent Test Results
                  </Text>
                </View>

                {recentTests.slice(0, 5).map((result, index) => (
                  <View key={result.id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < 4 ? 1 : 0,
                    borderBottomColor: '#f3f4f6'
                  }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{
                          fontSize: fontSize,
                          fontWeight: '600',
                          color: '#1f2937',
                          marginRight: 8
                        }}>
                          {result.test_name}
                        </Text>
                        {result.is_best_record && (
                          <Feather name="award" size={16} color="#10b981" />
                        )}
                      </View>
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: '#6b7280',
                        marginBottom: 2
                      }}>
                        {result.fitness_component}
                      </Text>
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: '#9ca3af'
                      }}>
                        {formatDate(result.test_date)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{
                        fontSize: fontSize + 2,
                        fontWeight: 'bold',
                        color: result.is_best_record ? '#10b981' : '#1f2937'
                      }}>
                        {formatResult(result)}
                      </Text>
                      {result.is_best_record && (
                        <Text style={{
                          fontSize: fontSize - 3,
                          color: '#10b981',
                          fontWeight: '600'
                        }}>
                          PERSONAL BEST
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Personal Best Records */}
            {bestRecords.length > 0 && (
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Feather name="award" size={20} color="#10b981" />
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginLeft: 8
                  }}>
                    Personal Best Records
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing / 2 }}>
                  {bestRecords.map((record) => (
                    <View key={record.id} style={{
                      backgroundColor: '#f0fdf4',
                      borderColor: '#10b981',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      minWidth: isSmallScreen ? '48%' : '30%',
                      flexGrow: 1
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Feather name="award" size={16} color="#10b981" />
                        <Text style={{
                          fontSize: fontSize - 1,
                          fontWeight: 'bold',
                          color: '#10b981',
                          marginLeft: 4
                        }}>
                          BEST
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: 2
                      }}>
                        {record.test_name}
                      </Text>
                      <Text style={{
                        fontSize: fontSize + 2,
                        fontWeight: 'bold',
                        color: '#10b981',
                        marginBottom: 2
                      }}>
                        {formatResult(record)}
                      </Text>
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: '#166534'
                      }}>
                        {formatDate(record.test_date)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {performanceStats?.total_tests === 0 && (
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding * 2,
                borderRadius: 16,
                alignItems: 'center',
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
                  <Feather name="bar-chart-2" size={36} color="#9ca3af" />
                </View>
                
                <Text style={{
                  fontSize: fontSize + 4,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  No Test Data Available
                </Text>
                
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: 24,
                  maxWidth: 320
                }}>
                  {athlete.full_name} hasn't completed any fitness tests yet. Start by adding some test results to see their progress here.
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
