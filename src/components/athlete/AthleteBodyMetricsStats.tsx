import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis, VictoryTheme } from 'victory-native';
import {
  BodyMetric,
  getAthleteBodyMetrics,
  getBodyMetricsStats,
  createBodyMetric,
  updateBodyMetric,
  deleteBodyMetric,
  getBMICategory
} from '../../lib/body-metrics-api';
import { BodyMetricModal } from './BodyMetricModal';
import { useToast } from '../../contexts/ToastContext';

interface AthleteBodyMetricsStatsProps {
  athleteId: number;
  athleteName: string;
}

export function AthleteBodyMetricsStats({ athleteId, athleteName }: AthleteBodyMetricsStatsProps) {
  const { width } = useWindowDimensions();
  const { showSuccess, showError } = useToast();

  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;

  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<BodyMetric | undefined>();
  const [selectedChart, setSelectedChart] = useState<'weight' | 'bmi' | 'muscle' | 'bodyfat'>('weight');

  useEffect(() => {
    fetchMetrics();
  }, [athleteId]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const [metricsData, statsData] = await Promise.all([
        getAthleteBodyMetrics(athleteId),
        getBodyMetricsStats(athleteId)
      ]);
      setMetrics(metricsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching body metrics:', error);
      showError('Failed to load body metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMetric = () => {
    setEditingMetric(undefined);
    setShowModal(true);
  };

  const handleEditMetric = (metric: BodyMetric) => {
    setEditingMetric(metric);
    setShowModal(true);
  };

  const handleSaveMetric = async (data: any) => {
    try {
      if (editingMetric) {
        const result = await updateBodyMetric(editingMetric.id, data);
        if (result.success) {
          showSuccess(result.message);
          fetchMetrics();
        } else {
          showError(result.message);
        }
      } else {
        const result = await createBodyMetric({
          athlete_id: athleteId,
          ...data
        });
        if (result.success) {
          showSuccess(result.message);
          fetchMetrics();
        } else {
          showError(result.message);
        }
      }
    } catch (error) {
      showError('Failed to save body metrics');
    }
  };

  const handleDeleteMetric = (metric: BodyMetric) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this measurement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteBodyMetric(metric.id);
            if (result.success) {
              showSuccess(result.message);
              fetchMetrics();
            } else {
              showError(result.message);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Prepare chart data - reverse to show oldest to newest (left to right)
  const chartData = metrics
    .slice()
    .reverse() // Reverse because metrics come DESC, we want ASC for chart
    .map((m, index) => {
      let y = 0;
      switch (selectedChart) {
        case 'weight':
          y = m.weight || 0;
          break;
        case 'bmi':
          y = m.bmi || 0;
          break;
        case 'muscle':
          y = m.muscle_mass || 0;
          break;
        case 'bodyfat':
          y = m.body_fat_percentage || 0;
          break;
      }
      return {
        x: index + 1,
        y,
        date: m.measurement_date,
        created_at: m.created_at
      };
    });

  const getChartLabel = () => {
    switch (selectedChart) {
      case 'weight':
        return 'Weight (kg)';
      case 'bmi':
        return 'BMI';
      case 'muscle':
        return 'Muscle Mass (kg)';
      case 'bodyfat':
        return 'Body Fat (%)';
      default:
        return '';
    }
  };

  const getChartColor = () => {
    switch (selectedChart) {
      case 'weight':
        return '#3b82f6';
      case 'bmi':
        return '#10b981';
      case 'muscle':
        return '#f59e0b';
      case 'bodyfat':
        return '#8b5cf6';
      default:
        return '#3b82f6';
    }
  };

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Feather name="loader" size={32} color="#6b7280" />
        <Text style={{ marginTop: 12, fontSize, color: '#6b7280' }}>
          Loading body metrics...
        </Text>
      </View>
    );
  }

  if (metrics.length === 0) {
    return (
      <>
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 16,
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
            <Feather name="activity" size={36} color="#9ca3af" />
          </View>

          <Text style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 8,
            textAlign: 'center'
          }}>
            No Body Metrics Yet
          </Text>

          <Text style={{
            fontSize,
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 280,
            marginBottom: 24
          }}>
            Start tracking body composition to monitor progress over time
          </Text>

          <Pressable
            onPress={handleAddMetric}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: '#3b82f6',
              borderRadius: 8
            }}
          >
            <Feather name="plus" size={20} color="white" />
            <Text style={{
              color: 'white',
              fontSize,
              fontWeight: '600',
              marginLeft: 8
            }}>
              Add First Measurement
            </Text>
          </Pressable>
        </View>

        <BodyMetricModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveMetric}
          existingMetric={editingMetric}
          athleteName={athleteName}
        />
      </>
    );
  }

  const latestMetric = metrics[0];
  const bmiInfo = latestMetric.bmi ? getBMICategory(latestMetric.bmi) : null;

  return (
    <>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Latest Stats Card */}
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 16,
          marginBottom: spacing
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Latest Measurement
            </Text>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280'
            }}>
              {formatDate(latestMetric.measurement_date)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {latestMetric.weight && (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 4 }}>
                  Weight
                </Text>
                <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#3b82f6' }}>
                  {latestMetric.weight}
                  <Text style={{ fontSize: fontSize, color: '#6b7280' }}> kg</Text>
                </Text>
                {stats?.weightChange !== null && stats?.weightChange !== 0 && (
                  <Text style={{
                    fontSize: fontSize - 2,
                    color: stats.weightChange > 0 ? '#10b981' : '#ef4444',
                    marginTop: 4
                  }}>
                    {stats.weightChange > 0 ? '+' : ''}{stats.weightChange} kg
                  </Text>
                )}
              </View>
            )}

            {latestMetric.height && (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 4 }}>
                  Height
                </Text>
                <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#6366f1' }}>
                  {latestMetric.height}
                  <Text style={{ fontSize: fontSize, color: '#6b7280' }}> cm</Text>
                </Text>
              </View>
            )}

            {latestMetric.bmi && bmiInfo && (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 4 }}>
                  BMI
                </Text>
                <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: bmiInfo.color }}>
                  {latestMetric.bmi.toFixed(1)}
                </Text>
                <View style={{
                  backgroundColor: bmiInfo.bgColor,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  marginTop: 4
                }}>
                  <Text style={{
                    fontSize: fontSize - 3,
                    fontWeight: '600',
                    color: bmiInfo.color
                  }}>
                    {bmiInfo.category.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}

            {latestMetric.muscle_mass && (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 4 }}>
                  Muscle Mass
                </Text>
                <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#f59e0b' }}>
                  {latestMetric.muscle_mass}
                  <Text style={{ fontSize: fontSize, color: '#6b7280' }}> kg</Text>
                </Text>
              </View>
            )}

            {latestMetric.body_fat_percentage && (
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280', marginBottom: 4 }}>
                  Body Fat
                </Text>
                <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#8b5cf6' }}>
                  {latestMetric.body_fat_percentage}
                  <Text style={{ fontSize: fontSize, color: '#6b7280' }}> %</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chart Card */}
        {chartData.length >= 1 && (
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 12
            }}>
              Progress Chart
            </Text>

            {/* Chart Type Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2, marginBottom: 16 }}
            >
              {[
                { key: 'weight', label: 'Weight', icon: 'trending-up' },
                { key: 'bmi', label: 'BMI', icon: 'activity' },
                { key: 'muscle', label: 'Muscle', icon: 'zap' },
                { key: 'bodyfat', label: 'Body Fat', icon: 'percent' }
              ].map(({ key, label, icon }) => (
                <Pressable
                  key={key}
                  onPress={() => setSelectedChart(key as any)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    backgroundColor: selectedChart === key ? getChartColor() : '#f3f4f6',
                    borderRadius: 8,
                    minWidth: 100
                  }}
                >
                  <Feather
                    name={icon as any}
                    size={14}
                    color={selectedChart === key ? 'white' : '#6b7280'}
                  />
                  <Text style={{
                    fontSize: fontSize - 2,
                    fontWeight: selectedChart === key ? '600' : '400',
                    color: selectedChart === key ? 'white' : '#6b7280',
                    marginLeft: 6
                  }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Chart */}
            <View style={{ height: 220, width: '100%' }}>
              <VictoryChart
                theme={VictoryTheme.material}
                height={220}
                width={width - (cardPadding * 2) - (isTablet ? 64 : isSmallScreen ? 32 : 48)}
                padding={{ top: 20, bottom: 40, left: 55, right: 20 }}
                domain={{
                  x: [0.5, Math.max(chartData.length, 2) + 0.5],
                  y: (() => {
                    const values = chartData.map(d => d.y).filter(v => v > 0);
                    if (values.length === 0) return [0, 100];
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const padding = (max - min) * 0.2 || 10;
                    return [Math.max(0, min - padding), max + padding];
                  })()
                }}
              >
                <VictoryAxis
                  tickCount={Math.min(chartData.length, 5)}
                  tickFormat={(t) => {
                    const index = Math.round(t) - 1;
                    if (index >= 0 && index < chartData.length) {
                      const dateStr = chartData[index].date;
                      const date = new Date(dateStr);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }
                    return '';
                  }}
                  style={{
                    axis: { stroke: '#e5e7eb' },
                    tickLabels: { fontSize: 9, fill: '#6b7280', angle: 0 }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  tickCount={5}
                  tickFormat={(t) => {
                    // Format numbers properly
                    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
                    if (t % 1 === 0) return t.toString();
                    return t.toFixed(1);
                  }}
                  style={{
                    axis: { stroke: '#e5e7eb' },
                    tickLabels: { fontSize: 9, fill: '#6b7280' },
                    grid: { stroke: '#f3f4f6', strokeDasharray: '4,4' }
                  }}
                />
                <VictoryLine
                  data={chartData}
                  x="x"
                  y="y"
                  style={{
                    data: {
                      stroke: getChartColor(),
                      strokeWidth: 3
                    }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
                <VictoryScatter
                  data={chartData}
                  x="x"
                  y="y"
                  size={7}
                  style={{
                    data: {
                      fill: getChartColor(),
                      stroke: 'white',
                      strokeWidth: 2
                    }
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 }
                  }}
                />
              </VictoryChart>
            </View>

            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              textAlign: 'center',
              marginTop: 8
            }}>
              {getChartLabel()} over time
            </Text>
          </View>
        )}

        {/* Measurements History */}
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 16,
          marginBottom: spacing
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Measurement History ({metrics.length})
            </Text>
            <Pressable
              onPress={handleAddMetric}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#3b82f6',
                borderRadius: 8
              }}
            >
              <Feather name="plus" size={16} color="white" />
              <Text style={{
                color: 'white',
                fontSize: fontSize - 2,
                fontWeight: '600',
                marginLeft: 4
              }}>
                Add
              </Text>
            </Pressable>
          </View>

          {metrics.map((metric, index) => {
            const metricBMI = metric.bmi ? getBMICategory(metric.bmi) : null;
            return (
              <View
                key={metric.id}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: index < metrics.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6'
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: 4
                    }}>
                      {formatDate(metric.measurement_date)}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {metric.weight && (
                        <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
                          Weight: {metric.weight} kg
                        </Text>
                      )}
                      {metric.height && (
                        <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
                          Height: {metric.height} cm
                        </Text>
                      )}
                      {metric.bmi && metricBMI && (
                        <Text style={{ fontSize: fontSize - 2, color: metricBMI.color }}>
                          BMI: {metric.bmi.toFixed(1)}
                        </Text>
                      )}
                      {metric.muscle_mass && (
                        <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
                          Muscle: {metric.muscle_mass} kg
                        </Text>
                      )}
                    </View>
                    {metric.notes && (
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: '#9ca3af',
                        fontStyle: 'italic',
                        marginTop: 4
                      }}>
                        {metric.notes}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleEditMetric(metric)}
                      style={{
                        padding: 8,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 6
                      }}
                    >
                      <Feather name="edit-2" size={16} color="#6b7280" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteMetric(metric)}
                      style={{
                        padding: 8,
                        backgroundColor: '#fef2f2',
                        borderRadius: 6
                      }}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <BodyMetricModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveMetric}
        existingMetric={editingMetric}
        athleteName={athleteName}
      />
    </>
  );
}