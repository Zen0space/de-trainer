import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { tursoDbHelpers } from '../../lib/turso-database';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryScatter } from 'victory-native';

interface ProgressData {
  id: number;
  test_id: number;
  test_name: string;
  fitness_component: string;
  unit: string;
  improvement_direction: 'higher' | 'lower';
  result_value: number | null;
  test_date: string;
  is_best_record: boolean;
  recent_rank: number;
}

interface ComponentProgress {
  component: string;
  latestResult: ProgressData | null;
  previousResult: ProgressData | null;
  personalRecords: number;
  totalTests: number;
  improvement: number | null;
  trend: 'up' | 'down' | 'neutral';
}

interface ProgressStats {
  totalPersonalRecords: number;
  recentPersonalRecords: number;
  activeComponents: number;
  improvingComponents: number;
  totalTests: number;
  recentTests: number;
}

interface ChartDataPoint {
  x: Date;
  y: number;
  label?: string;
}

interface TestChartData {
  testName: string;
  testId: number;
  unit: string;
  improvementDirection: 'higher' | 'lower';
  data: ChartDataPoint[];
  component: string;
}

type TimePeriod = '7d' | '30d' | '90d';

export function AthleteProgressScreen() {
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
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [componentProgress, setComponentProgress] = useState<ComponentProgress[]>([]);
  const [progressStats, setProgressStats] = useState<ProgressStats>({
    totalPersonalRecords: 0,
    recentPersonalRecords: 0,
    activeComponents: 0,
    improvingComponents: 0,
    totalTests: 0,
    recentTests: 0
  });
  const [recentAchievements, setRecentAchievements] = useState<ProgressData[]>([]);
  const [chartData, setChartData] = useState<TestChartData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch progress data
  const fetchProgressData = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch all progress data using the athlete_progress view
      const allProgress = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.test_id,
          t.name as test_name,
          fc.name as fitness_component,
          t.unit,
          t.improvement_direction,
          tr.result_value,
          tr.test_date,
          tr.is_best_record,
          ROW_NUMBER() OVER (
            PARTITION BY tr.test_id 
            ORDER BY tr.test_date DESC
          ) as recent_rank
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        JOIN fitness_components fc ON t.component_id = fc.id
        WHERE tr.athlete_id = ? AND tr.result_value IS NOT NULL
        ORDER BY tr.test_date DESC
      `, [user.id]);

      setProgressData(allProgress || []);

      // Calculate component-wise progress
      const componentMap = new Map<string, ComponentProgress>();
      
      (allProgress || []).forEach((item: ProgressData) => {
        if (!componentMap.has(item.fitness_component)) {
          componentMap.set(item.fitness_component, {
            component: item.fitness_component,
            latestResult: null,
            previousResult: null,
            personalRecords: 0,
            totalTests: 0,
            improvement: null,
            trend: 'neutral'
          });
        }
        
        const comp = componentMap.get(item.fitness_component)!;
        comp.totalTests++;
        
        if (item.is_best_record) {
          comp.personalRecords++;
        }
        
        // Set latest and previous results for the same test
        if (item.recent_rank === 1 && !comp.latestResult) {
          comp.latestResult = item;
        } else if (item.recent_rank === 2 && !comp.previousResult && comp.latestResult?.test_id === item.test_id) {
          comp.previousResult = item;
        }
      });

      // Calculate improvement and trends
      const componentProgressArray: ComponentProgress[] = Array.from(componentMap.values()).map(comp => {
        if (comp.latestResult && comp.previousResult && comp.latestResult.result_value && comp.previousResult.result_value) {
          const latest = comp.latestResult.result_value;
          const previous = comp.previousResult.result_value;
          const isHigherBetter = comp.latestResult.improvement_direction === 'higher';
          
          let improvement: number;
          if (isHigherBetter) {
            improvement = ((latest - previous) / previous) * 100;
            comp.trend = latest > previous ? 'up' : latest < previous ? 'down' : 'neutral';
          } else {
            improvement = ((previous - latest) / previous) * 100;
            comp.trend = latest < previous ? 'up' : latest > previous ? 'down' : 'neutral';
          }
          
          comp.improvement = improvement;
        }
        
        return comp;
      });

      setComponentProgress(componentProgressArray);

      // Calculate overall stats
      const totalPersonalRecords = (allProgress || []).filter(p => p.is_best_record).length;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentData = (allProgress || []).filter(p => new Date(p.test_date) >= thirtyDaysAgo);
      const recentPersonalRecords = recentData.filter(p => p.is_best_record).length;
      const improvingComponents = componentProgressArray.filter(c => c.trend === 'up').length;

      setProgressStats({
        totalPersonalRecords,
        recentPersonalRecords,
        activeComponents: componentProgressArray.length,
        improvingComponents,
        totalTests: (allProgress || []).length,
        recentTests: recentData.length
      });

      // Get recent achievements (personal records from last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const achievements = (allProgress || [])
        .filter(p => p.is_best_record && new Date(p.test_date) >= sixtyDaysAgo)
        .slice(0, 5);
      
      setRecentAchievements(achievements);

      // Prepare chart data for tests with multiple results
      const testChartData = await prepareChartData(allProgress || []);
      setChartData(testChartData);

    } catch (error) {
      console.error('❌ Error fetching progress data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Prepare chart data for visualization
  const prepareChartData = async (allProgress: ProgressData[]): Promise<TestChartData[]> => {
    const testMap = new Map<number, TestChartData>();
    
    // Group results by test_id
    allProgress.forEach(item => {
      if (!testMap.has(item.test_id)) {
        testMap.set(item.test_id, {
          testName: item.test_name,
          testId: item.test_id,
          unit: item.unit,
          improvementDirection: item.improvement_direction,
          component: item.fitness_component,
          data: []
        });
      }
      
      const test = testMap.get(item.test_id)!;
      if (item.result_value !== null) {
        test.data.push({
          x: new Date(item.test_date),
          y: item.result_value,
          label: `${item.result_value} ${item.unit}`
        });
      }
    });

    // Filter tests that have at least 1 data point and sort by date
    const chartsData: TestChartData[] = [];
    testMap.forEach(test => {
      if (test.data.length >= 1) {
        test.data.sort((a, b) => a.x.getTime() - b.x.getTime());
        chartsData.push(test);
      }
    });

    return chartsData;
  };

  useEffect(() => {
    fetchProgressData();
  }, [user?.id]);

  // Handle refresh
  const onRefresh = () => {
    fetchProgressData(true);
  };

  // Memoized filtered chart data for better performance
  const filteredChartData = useMemo(() => {
    const now = new Date();
    let daysBack = 30; // default
    
    switch (selectedTimePeriod) {
      case '7d':
        daysBack = 7;
        break;
      case '30d':
        daysBack = 30;
        break;
      case '90d':
        daysBack = 90;
        break;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysBack);
    
    return chartData.map(test => ({
      ...test,
      data: test.data.filter(point => point.x >= cutoffDate)
    })).filter(test => test.data.length >= 1);
  }, [chartData, selectedTimePeriod]);

  const TimePeriodSelector = () => (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 4,
      marginBottom: spacing,
    }}>
      {(['7d', '30d', '90d'] as TimePeriod[]).map((period) => (
        <Pressable
          key={period}
          onPress={() => setSelectedTimePeriod(period)}
          style={{
            flex: 1,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 6,
            backgroundColor: selectedTimePeriod === period ? '#10b981' : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text style={{
            fontSize: fontSize - 2,
            fontWeight: selectedTimePeriod === period ? '600' : '500',
            color: selectedTimePeriod === period ? 'white' : '#6b7280'
          }}>
            {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const TestProgressChart = React.memo(({ testData }: { testData: TestChartData }) => {
    const filteredData = useMemo(() => {
      const now = new Date();
      let daysBack = 30;
      
      switch (selectedTimePeriod) {
        case '7d':
          daysBack = 7;
          break;
        case '30d':
          daysBack = 30;
          break;
        case '90d':
          daysBack = 90;
          break;
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - daysBack);
      return testData.data.filter(point => point.x >= cutoffDate);
    }, [testData.data, selectedTimePeriod]);

    if (filteredData.length < 1) return null;

    const chartWidth = width - (containerPadding * 2) - 32;
    const maxValue = Math.max(...filteredData.map(d => d.y));
    const minValue = Math.min(...filteredData.map(d => d.y));
    const range = maxValue - minValue;
    const yAxisLabelWidth = 50;

    // Calculate trend
    const firstValue = filteredData[0].y;
    const lastValue = filteredData[filteredData.length - 1].y;
    const hasMultiplePoints = filteredData.length > 1;
    
    let isImproving = false;
    let changePercent = '0.0';
    
    if (hasMultiplePoints) {
      isImproving = testData.improvementDirection === 'higher' 
        ? lastValue > firstValue 
        : lastValue < firstValue;
      changePercent = ((Math.abs(lastValue - firstValue) / firstValue) * 100).toFixed(1);
    }

    return (
      <View style={{
        backgroundColor: 'white',
        padding: cardPadding,
        borderRadius: 12,
        marginBottom: spacing,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: fontSize,
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: 2
            }}>
              {testData.testName}
            </Text>
            <Text style={{
              fontSize: fontSize - 3,
              color: '#6b7280'
            }}>
              {testData.component}
            </Text>
          </View>
          
          {hasMultiplePoints ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isImproving ? '#f0fdf4' : '#fef2f2',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6
            }}>
              <Feather 
                name={isImproving ? 'trending-up' : 'trending-down'} 
                size={12} 
                color={isImproving ? '#10b981' : '#ef4444'} 
              />
              <Text style={{
                fontSize: fontSize - 3,
                fontWeight: '600',
                color: isImproving ? '#10b981' : '#ef4444',
                marginLeft: 4
              }}>
                {changePercent}%
              </Text>
            </View>
          ) : (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f0f9ff',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6
            }}>
              <Feather 
                name="target" 
                size={12} 
                color="#3b82f6" 
              />
              <Text style={{
                fontSize: fontSize - 3,
                fontWeight: '600',
                color: '#3b82f6',
                marginLeft: 4
              }}>
                Baseline
              </Text>
            </View>
          )}
        </View>

        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <VictoryChart
            width={chartWidth}
            height={200}
            padding={{ left: 60, top: 20, right: 40, bottom: 40 }}
            domain={{ y: [Math.max(0, minValue - (range * 0.1)), maxValue + (range * 0.1)] }}
          >
            <VictoryAxis
              dependentAxis
              tickFormat={(value: number) => `${value.toFixed(1)} ${testData.unit}`}
              style={{
                tickLabels: { fontSize: 12, fill: '#6b7280' },
                grid: { stroke: '#f3f4f6', strokeWidth: 1 },
                axis: { stroke: '#e5e7eb', strokeWidth: 1 }
              }}
            />
            <VictoryAxis
              tickFormat={(date: Date) => new Date(date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
              style={{
                tickLabels: { fontSize: 12, fill: '#6b7280', angle: -45, textAnchor: 'end' },
                grid: { stroke: '#f3f4f6', strokeWidth: 1 },
                axis: { stroke: '#e5e7eb', strokeWidth: 1 }
              }}
            />
            
            {hasMultiplePoints ? (
              <VictoryLine
                data={filteredData}
                style={{
                  data: { stroke: '#10b981', strokeWidth: 3 }
                }}
                animate={{
                  duration: 1000,
                  onLoad: { duration: 500 }
                }}
              />
            ) : null}
            
            <VictoryScatter
              data={filteredData}
              size={hasMultiplePoints ? 4 : 6}
              style={{
                data: { fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }
              }}
            />
          </VictoryChart>
          
          {!hasMultiplePoints && (
            <View style={{
              backgroundColor: '#f0f9ff',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              marginTop: -10
            }}>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#3b82f6',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                📍 Current performance baseline - test again to see progress!
              </Text>
            </View>
          )}
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6'
        }}>
          <View>
            <Text style={{ fontSize: fontSize - 3, color: '#9ca3af' }}>Latest</Text>
            <Text style={{ fontSize: fontSize - 1, fontWeight: '600', color: '#1f2937' }}>
              {lastValue} {testData.unit}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize - 3, color: '#9ca3af' }}>Data Points</Text>
            <Text style={{ fontSize: fontSize - 1, fontWeight: '600', color: '#1f2937' }}>
              {filteredData.length}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize - 3, color: '#9ca3af' }}>Best</Text>
            <Text style={{ fontSize: fontSize - 1, fontWeight: '600', color: '#10b981' }}>
              {testData.improvementDirection === 'higher' ? maxValue : minValue} {testData.unit}
            </Text>
          </View>
        </View>
      </View>
    );
  });

  const ComponentProgressCard = ({ component }: { component: ComponentProgress }) => (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding,
      borderRadius: 12,
      marginBottom: spacing,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: '#1f2937',
          flex: 1
        }}>
          {component.component}
        </Text>
        
        {component.trend !== 'neutral' && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: component.trend === 'up' ? '#f0fdf4' : '#fef2f2',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6
          }}>
            <Feather 
              name={component.trend === 'up' ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={component.trend === 'up' ? '#10b981' : '#ef4444'} 
            />
            {component.improvement !== null && (
              <Text style={{
                fontSize: fontSize - 3,
                fontWeight: '600',
                color: component.trend === 'up' ? '#10b981' : '#ef4444',
                marginLeft: 4
              }}>
                {Math.abs(component.improvement).toFixed(1)}%
              </Text>
            )}
          </View>
        )}
      </View>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 2 }}>
            Latest Result
          </Text>
          {component.latestResult ? (
            <Text style={{ fontSize: fontSize, fontWeight: '600', color: '#1f2937' }}>
              {component.latestResult.result_value} {component.latestResult.unit}
            </Text>
          ) : (
            <Text style={{ fontSize: fontSize, color: '#9ca3af' }}>No data</Text>
          )}
        </View>
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 2 }}>
            Personal Records
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="award" size={14} color="#f59e0b" />
            <Text style={{ fontSize: fontSize, fontWeight: '600', color: '#f59e0b', marginLeft: 4 }}>
              {component.personalRecords}
            </Text>
          </View>
        </View>
        
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 2 }}>
            Total Tests
          </Text>
          <Text style={{ fontSize: fontSize, fontWeight: '600', color: '#1f2937' }}>
            {component.totalTests}
          </Text>
        </View>
      </View>
      
      {component.latestResult && (
        <Text style={{ fontSize: fontSize - 3, color: '#9ca3af', marginTop: 4 }}>
          Last tested: {new Date(component.latestResult.test_date).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  const AchievementCard = ({ achievement }: { achievement: ProgressData }) => (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding,
      borderRadius: 12,
      marginRight: 12,
      minWidth: 200,
      borderLeftWidth: 4,
      borderLeftColor: '#10b981',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Feather name="award" size={16} color="#10b981" />
        <Text style={{
          fontSize: fontSize - 2,
          fontWeight: '600',
          color: '#10b981',
          marginLeft: 6
        }}>
          PERSONAL RECORD
        </Text>
      </View>
      
      <Text style={{
        fontSize: fontSize,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4
      }}>
        {achievement.test_name}
      </Text>
      
      <Text style={{
        fontSize: fontSize + 2,
        fontWeight: 'bold',
        color: '#10b981',
        marginBottom: 4
      }}>
        {achievement.result_value} {achievement.unit}
      </Text>
      
      <Text style={{ fontSize: fontSize - 3, color: '#6b7280' }}>
        {achievement.fitness_component}
      </Text>
      
      <Text style={{ fontSize: fontSize - 3, color: '#9ca3af', marginTop: 4 }}>
        {new Date(achievement.test_date).toLocaleDateString()}
      </Text>
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
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
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
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: titleFontSize,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 4
                }}>
                  My Progress
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  Track your fitness improvements over time
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
                <Feather name="trending-up" size={20} color="white" />
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
                Loading your progress...
              </Text>
            </View>
          ) : progressData.length > 0 ? (
            <>
              {/* Progress Stats */}
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
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#10b981', marginBottom: 4 }}>
                      {progressStats.totalPersonalRecords}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Personal Records</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#3b82f6', marginBottom: 4 }}>
                      {progressStats.improvingComponents}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Improving Areas</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 }}>
                      {progressStats.activeComponents}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Active Components</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 12,
                  }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 4 }}>
                      {progressStats.recentPersonalRecords}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Recent PRs (30d)</Text>
                  </View>
                </View>
              </View>



              {/* Progress Charts */}
              {chartData.length > 0 ? (
                <View style={{ marginBottom: spacing }}>
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 12,
                    paddingHorizontal: 4
                  }}>
                    Progress Charts 📈
                  </Text>
                  
                  <TimePeriodSelector />
                  
                  {filteredChartData.map((testData) => (
                    <TestProgressChart key={testData.testId} testData={testData} />
                  ))}
                </View>
              ) : progressData.length > 0 ? (
                <View style={{
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 16,
                  marginBottom: spacing,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12
                    }}>
                      <Feather name="bar-chart-2" size={20} color="#6b7280" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: fontSize + 1,
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: 2
                      }}>
                        Progress Charts Coming Soon! 📈
                      </Text>
                      <Text style={{
                        fontSize: fontSize - 1,
                        color: '#6b7280'
                      }}>
                        Charts will appear once you repeat the same tests
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    backgroundColor: '#f3f3f3',
                    padding: 12,
                    borderRadius: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: '#3b82f6'
                  }}>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#374151',
                      lineHeight: 20
                    }}>
                      <Text style={{ fontWeight: '600' }}>How to see progress charts:</Text>{'\n'}
                      • Perform the same fitness test multiple times{'\n'}
                      • For example: Do "1RM Bench Press" again next week{'\n'}
                      • Charts will automatically appear to show your improvement over time
                    </Text>
                  </View>
                </View>
              ) : null}


            </>
          ) : (
            /* Empty State */
            <EmptyState
              icon="trending-up"
              title="No Progress Data Yet"
              description="Your trainer hasn't added any fitness test results yet. Once they start tracking your performance, your progress will appear here."
            />
          )}

        </View>
      </ScrollView>
    </View>
  );
}
