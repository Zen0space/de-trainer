/**
 * Date and Time Utilities
 * 
 * Handles timezone conversions and date formatting for the Jejak Atlet app.
 * All timestamps in the database are stored in UTC format.
 */

/**
 * Parse a date string from the database (UTC) to a JavaScript Date object
 * 
 * Database timestamps are in UTC format: "2025-11-05 03:20:45"
 * This function ensures they are correctly parsed as UTC, not local time.
 * 
 * @param dateString - Date string from database (UTC)
 * @returns Date object in user's local timezone
 */
export function parseDatabaseDate(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }

  // Check if already in ISO format with timezone
  if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
    return new Date(dateString);
  }

  // Check if it's a date-only string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Date only - treat as UTC midnight
    return new Date(dateString + 'T00:00:00Z');
  }

  // SQLite format without timezone - treat as UTC
  // Convert "2025-11-05 03:20:45" to "2025-11-05T03:20:45Z"
  const utcDateString = dateString.replace(' ', 'T') + 'Z';
  return new Date(utcDateString);
}

/**
 * Format a date as "time ago" (e.g., "2 hours ago", "3 days ago")
 * 
 * @param dateString - Date string from database (UTC)
 * @returns Formatted string like "2 hours ago"
 */
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = parseDatabaseDate(dateString);
  
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format a date as "time ago" (short version for compact displays)
 * 
 * @param dateString - Date string from database (UTC)
 * @returns Formatted string like "2h ago", "3d ago"
 */
export function formatTimeAgoShort(dateString: string): string {
  const now = new Date();
  const date = parseDatabaseDate(dateString);
  
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Get current timestamp in UTC format for database storage
 * 
 * @returns UTC timestamp string in format "2025-11-05 03:20:45"
 */
export function getCurrentUTCTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Format a date for display in user's local timezone
 * 
 * @param dateString - Date string from database (UTC)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDatabaseDate(dateString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format a date and time for display in user's local timezone
 * 
 * @param dateString - Date string from database (UTC)
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string): string {
  const date = parseDatabaseDate(dateString);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
