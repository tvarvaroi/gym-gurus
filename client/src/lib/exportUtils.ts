import type { Client, Workout, ProgressEntry } from "@shared/schema";

// Helper function to convert data to CSV format
function convertToCSV(data: any[], headers: string[]): string {
  if (!data.length) return '';
  
  // Create CSV header
  const csvHeader = headers.join(',');
  
  // Create CSV rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const keys = header.split('.');
      let value = row;
      
      // Handle nested properties
      for (const key of keys) {
        value = value?.[key];
      }
      
      // Handle special types
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string') {
        // Escape commas and quotes in strings
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return value.toString();
    }).join(',');
  });
  
  return [csvHeader, ...csvRows].join('\n');
}

// Helper function to download CSV file
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export clients to CSV
export function exportClientsToCSV(clients: Client[], filename = 'clients_export.csv'): void {
  const headers = [
    'name',
    'email',
    'phone',
    'goal',
    'status',
    'lastSession',
    'nextSession',
    'height',
    'weight',
    'notes'
  ];
  
  const csvContent = convertToCSV(clients, headers);
  downloadCSV(csvContent, filename);
}

// Export workouts to CSV
export function exportWorkoutsToCSV(workouts: Workout[], filename = 'workouts_export.csv'): void {
  const headers = [
    'title',
    'description',
    'category',
    'difficulty',
    'duration',
    'createdAt'
  ];
  
  const csvContent = convertToCSV(workouts, headers);
  downloadCSV(csvContent, filename);
}

// Export progress entries to CSV
export function exportProgressToCSV(progress: ProgressEntry[], filename = 'progress_export.csv'): void {
  const headers = [
    'date',
    'weight',
    'bodyFat',
    'measurements.chest',
    'measurements.waist',
    'measurements.hips',
    'measurements.arms',
    'measurements.thighs',
    'notes',
    'photos'
  ];
  
  const csvContent = convertToCSV(progress, headers);
  downloadCSV(csvContent, filename);
}

// Export combined client report
export function exportClientReport(
  client: Client,
  workouts: Workout[],
  progress: ProgressEntry[],
  filename?: string
): void {
  const reportFilename = filename || `${client.name.replace(/\s+/g, '_')}_report.csv`;
  
  // Create a comprehensive report
  const reportData = [];
  
  // Client information section
  reportData.push(['CLIENT INFORMATION']);
  reportData.push(['Name', client.name]);
  reportData.push(['Email', client.email]);
  reportData.push(['Phone', client.phone || 'N/A']);
  reportData.push(['Goal', client.goal]);
  reportData.push(['Status', client.status]);
  reportData.push([]);
  
  // Workouts section
  reportData.push(['ASSIGNED WORKOUTS']);
  reportData.push(['Title', 'Category', 'Difficulty', 'Duration']);
  workouts.forEach(workout => {
    reportData.push([
      workout.title,
      workout.category,
      workout.difficulty,
      `${workout.duration} min`
    ]);
  });
  reportData.push([]);
  
  // Progress section
  reportData.push(['PROGRESS TRACKING']);
  reportData.push(['Date', 'Weight', 'Body Fat %', 'Notes']);
  progress.forEach(entry => {
    reportData.push([
      new Date(entry.date).toLocaleDateString(),
      entry.weight ? `${entry.weight} lbs` : 'N/A',
      entry.bodyFat ? `${entry.bodyFat}%` : 'N/A',
      entry.notes || 'N/A'
    ]);
  });
  
  const csvContent = reportData.map(row => row.join(',')).join('\n');
  downloadCSV(csvContent, reportFilename);
}

// Batch export all data
export function exportAllData(
  clients: Client[],
  workouts: Workout[],
  timestamp = new Date().toISOString().split('T')[0]
): void {
  exportClientsToCSV(clients, `clients_${timestamp}.csv`);
  exportWorkoutsToCSV(workouts, `workouts_${timestamp}.csv`);
}