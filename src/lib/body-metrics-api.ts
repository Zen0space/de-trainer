import { tursoDbHelpers } from './turso-database';

export interface BodyMetric {
  id: number;
  athlete_id: number;
  measurement_date: string;
  weight: number | null;
  height: number | null;
  muscle_mass: number | null;
  body_fat_percentage: number | null;
  bmi: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyMetricInput {
  athlete_id: number;
  measurement_date: string;
  weight?: number;
  height?: number;
  muscle_mass?: number;
  body_fat_percentage?: number;
  notes?: string;
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weight: number, height: number): number {
  if (!weight || !height || height === 0) return 0;
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): {
  category: string;
  color: string;
  bgColor: string;
} {
  if (bmi < 18.5) {
    return { category: 'Underweight', color: '#3b82f6', bgColor: '#eff6ff' };
  } else if (bmi < 25) {
    return { category: 'Normal', color: '#10b981', bgColor: '#f0fdf4' };
  } else if (bmi < 30) {
    return { category: 'Overweight', color: '#f59e0b', bgColor: '#fefbf2' };
  } else {
    return { category: 'Obese', color: '#ef4444', bgColor: '#fef2f2' };
  }
}

/**
 * Get all body metrics for an athlete
 */
export async function getAthleteBodyMetrics(athleteId: number): Promise<BodyMetric[]> {
  const metrics = await tursoDbHelpers.all(
    `SELECT * FROM athlete_body_metrics 
     WHERE athlete_id = ? 
     ORDER BY created_at DESC, id DESC`,
    [athleteId]
  );
  return (metrics || []) as BodyMetric[];
}

/**
 * Get latest body metric for an athlete
 */
export async function getLatestBodyMetric(athleteId: number): Promise<BodyMetric | null> {
  const metric = await tursoDbHelpers.get(
    `SELECT * FROM athlete_body_metrics 
     WHERE athlete_id = ? 
     ORDER BY created_at DESC, id DESC 
     LIMIT 1`,
    [athleteId]
  );
  return metric as BodyMetric | null;
}

/**
 * Create a new body metric
 */
export async function createBodyMetric(data: BodyMetricInput): Promise<{ success: boolean; id?: number; message: string }> {
  try {
    // Calculate BMI if weight and height are provided
    let bmi = null;
    if (data.weight && data.height) {
      bmi = calculateBMI(data.weight, data.height);
    }

    const result = await tursoDbHelpers.run(
      `INSERT INTO athlete_body_metrics 
       (athlete_id, measurement_date, weight, height, muscle_mass, body_fat_percentage, bmi, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.athlete_id,
        data.measurement_date,
        data.weight || null,
        data.height || null,
        data.muscle_mass || null,
        data.body_fat_percentage || null,
        bmi,
        data.notes || null
      ]
    );

    return {
      success: true,
      id: result.lastInsertRowid as number,
      message: 'Body metrics recorded successfully'
    };
  } catch (error) {
    console.error('Error creating body metric:', error);
    return {
      success: false,
      message: 'Failed to record body metrics'
    };
  }
}

/**
 * Update a body metric
 */
export async function updateBodyMetric(
  id: number,
  data: Partial<BodyMetricInput>
): Promise<{ success: boolean; message: string }> {
  try {
    // Get existing metric to calculate BMI if needed
    const existing = await tursoDbHelpers.get(
      'SELECT * FROM athlete_body_metrics WHERE id = ?',
      [id]
    ) as BodyMetric | null;

    if (!existing) {
      return { success: false, message: 'Body metric not found' };
    }

    const weight = data.weight !== undefined ? data.weight : existing.weight;
    const height = data.height !== undefined ? data.height : existing.height;
    
    let bmi = existing.bmi;
    if (weight && height) {
      bmi = calculateBMI(weight, height);
    }

    await tursoDbHelpers.run(
      `UPDATE athlete_body_metrics 
       SET measurement_date = COALESCE(?, measurement_date),
           weight = COALESCE(?, weight),
           height = COALESCE(?, height),
           muscle_mass = COALESCE(?, muscle_mass),
           body_fat_percentage = COALESCE(?, body_fat_percentage),
           bmi = ?,
           notes = COALESCE(?, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.measurement_date || null,
        data.weight !== undefined ? data.weight : null,
        data.height !== undefined ? data.height : null,
        data.muscle_mass !== undefined ? data.muscle_mass : null,
        data.body_fat_percentage !== undefined ? data.body_fat_percentage : null,
        bmi,
        data.notes !== undefined ? data.notes : null,
        id
      ]
    );

    return {
      success: true,
      message: 'Body metrics updated successfully'
    };
  } catch (error) {
    console.error('Error updating body metric:', error);
    return {
      success: false,
      message: 'Failed to update body metrics'
    };
  }
}

/**
 * Delete a body metric
 */
export async function deleteBodyMetric(id: number): Promise<{ success: boolean; message: string }> {
  try {
    await tursoDbHelpers.run(
      'DELETE FROM athlete_body_metrics WHERE id = ?',
      [id]
    );

    return {
      success: true,
      message: 'Body metric deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting body metric:', error);
    return {
      success: false,
      message: 'Failed to delete body metric'
    };
  }
}

/**
 * Get body metrics statistics
 */
export async function getBodyMetricsStats(athleteId: number): Promise<{
  totalMeasurements: number;
  latestWeight: number | null;
  weightChange: number | null;
  latestBMI: number | null;
  bmiChange: number | null;
}> {
  const metrics = await getAthleteBodyMetrics(athleteId);
  
  if (metrics.length === 0) {
    return {
      totalMeasurements: 0,
      latestWeight: null,
      weightChange: null,
      latestBMI: null,
      bmiChange: null
    };
  }

  const latest = metrics[0];
  const previous = metrics.length > 1 ? metrics[1] : null;

  const weightChange = previous && latest.weight && previous.weight
    ? parseFloat((latest.weight - previous.weight).toFixed(1))
    : null;

  const bmiChange = previous && latest.bmi && previous.bmi
    ? parseFloat((latest.bmi - previous.bmi).toFixed(1))
    : null;

  return {
    totalMeasurements: metrics.length,
    latestWeight: latest.weight,
    weightChange,
    latestBMI: latest.bmi,
    bmiChange
  };
}
