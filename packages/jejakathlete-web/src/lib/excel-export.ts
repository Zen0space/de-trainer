import * as XLSX from 'xlsx';

// Types for user data export
export interface UserExportData {
  // Basic user info
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
  
  // Profiling data
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  bio?: string | null;
  
  // Athlete data
  sport?: string | null;
  athlete_level?: string | null;
  
  // Trainer data
  trainer_code?: string | null;
  certification_id?: string | null;
  specialization?: string | null;
  verification_status?: string | null;
}

/**
 * Export a single user's data to Excel
 */
export function exportSingleUserToExcel(user: UserExportData, filename?: string) {
  const data = formatUserForExcel(user);
  
  // Create workbook with a single sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([data]);
  
  // Set column widths
  ws['!cols'] = Object.keys(data).map(() => ({ wch: 20 }));
  
  XLSX.utils.book_append_sheet(wb, ws, 'User Details');
  
  // Generate filename
  const exportFilename = filename || `user_${user.username || user.id}_${formatDate(new Date())}.xlsx`;
  
  // Trigger download
  XLSX.writeFile(wb, exportFilename);
}

/**
 * Export multiple users' data to Excel
 */
export function exportAllUsersToExcel(users: UserExportData[], filename?: string) {
  const data = users.map(formatUserForExcel);
  
  // Create workbook with a single sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const colWidths = [
    { wch: 36 }, // ID
    { wch: 20 }, // Full Name
    { wch: 15 }, // Username
    { wch: 10 }, // Role
    { wch: 10 }, // Verified
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
    { wch: 15 }, // Phone
    { wch: 25 }, // Address
    { wch: 15 }, // City
    { wch: 15 }, // Country
    { wch: 15 }, // Date of Birth
    { wch: 10 }, // Gender
    { wch: 30 }, // Bio
    { wch: 15 }, // Sport
    { wch: 15 }, // Athlete Level
    { wch: 15 }, // Trainer Code
    { wch: 20 }, // Certification ID
    { wch: 20 }, // Specialization
    { wch: 15 }, // Verification Status
  ];
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'All Users');
  
  // Generate filename
  const exportFilename = filename || `all_users_${formatDate(new Date())}.xlsx`;
  
  // Trigger download
  XLSX.writeFile(wb, exportFilename);
}

/**
 * Format user data for Excel export with readable column headers
 */
function formatUserForExcel(user: UserExportData) {
  return {
    'User ID': user.id,
    'Full Name': user.full_name || '',
    'Username': user.username || '',
    'Role': user.role,
    'Verified': user.is_verified ? 'Yes' : 'No',
    'Created At': user.created_at ? new Date(user.created_at).toLocaleString() : '',
    'Updated At': user.updated_at ? new Date(user.updated_at).toLocaleString() : '',
    'Phone': user.phone || '',
    'Address': user.address || '',
    'City': user.city || '',
    'Country': user.country || '',
    'Date of Birth': user.date_of_birth || '',
    'Gender': user.gender || '',
    'Bio': user.bio || '',
    'Sport': user.sport || '',
    'Athlete Level': user.athlete_level || '',
    'Trainer Code': user.trainer_code || '',
    'Certification ID': user.certification_id || '',
    'Specialization': user.specialization || '',
    'Verification Status': user.verification_status || '',
  };
}

/**
 * Format date for filename
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
