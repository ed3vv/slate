// Common timezones with UTC offsets
export const TIMEZONES = [
  { value: 'Pacific/Midway', label: 'UTC-11:00 (Midway)' },
  { value: 'Pacific/Honolulu', label: 'UTC-10:00 (Hawaii)' },
  { value: 'America/Anchorage', label: 'UTC-09:00 (Alaska)' },
  { value: 'America/Los_Angeles', label: 'UTC-08:00 (Pacific Time)' },
  { value: 'America/Denver', label: 'UTC-07:00 (Mountain Time)' },
  { value: 'America/Chicago', label: 'UTC-06:00 (Central Time)' },
  { value: 'America/New_York', label: 'UTC-05:00 (Eastern Time)' },
  { value: 'America/Caracas', label: 'UTC-04:00 (Caracas)' },
  { value: 'America/Sao_Paulo', label: 'UTC-03:00 (São Paulo)' },
  { value: 'Atlantic/South_Georgia', label: 'UTC-02:00 (South Georgia)' },
  { value: 'Atlantic/Azores', label: 'UTC-01:00 (Azores)' },
  { value: 'UTC', label: 'UTC+00:00 (UTC)' },
  { value: 'Europe/London', label: 'UTC+00:00 (London)' },
  { value: 'Europe/Paris', label: 'UTC+01:00 (Paris, Berlin)' },
  { value: 'Europe/Athens', label: 'UTC+02:00 (Athens, Cairo)' },
  { value: 'Europe/Moscow', label: 'UTC+03:00 (Moscow)' },
  { value: 'Asia/Dubai', label: 'UTC+04:00 (Dubai)' },
  { value: 'Asia/Karachi', label: 'UTC+05:00 (Karachi)' },
  { value: 'Asia/Kolkata', label: 'UTC+05:30 (India)' },
  { value: 'Asia/Dhaka', label: 'UTC+06:00 (Dhaka)' },
  { value: 'Asia/Bangkok', label: 'UTC+07:00 (Bangkok)' },
  { value: 'Asia/Shanghai', label: 'UTC+08:00 (China, Singapore)' },
  { value: 'Asia/Tokyo', label: 'UTC+09:00 (Tokyo, Seoul)' },
  { value: 'Australia/Sydney', label: 'UTC+10:00 (Sydney)' },
  { value: 'Pacific/Noumea', label: 'UTC+11:00 (New Caledonia)' },
  { value: 'Pacific/Auckland', label: 'UTC+12:00 (Auckland)' },
];

// Get browser's detected timezone
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// Convert a date to a specific timezone
export function formatInTimezone(date: Date | string, timezone: string, format: Intl.DateTimeFormatOptions = {}): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultFormat: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...format,
  };

  return new Intl.DateTimeFormat('en-US', defaultFormat).format(dateObj);
}

// Get date string (YYYY-MM-DD) in a specific timezone
export function getDateInTimezone(date: Date | string, timezone: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);

  return formatted; // Returns YYYY-MM-DD format
}

// Get start of day in a specific timezone
export function getStartOfDayInTimezone(timezone: string): Date {
  const now = new Date();
  const dateStr = getDateInTimezone(now, timezone);

  // Create a date object at midnight in the specified timezone
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  // This creates midnight in the user's local time, we need to adjust
  const localMidnight = new Date(year, month, day);

  // Get the timezone offset difference
  const localOffset = localMidnight.getTimezoneOffset() * 60000;
  const targetDate = new Date(localMidnight.getTime() - localOffset);

  return targetDate;
}

// Convert UTC timestamp to timezone-aware display
export function formatTimestamp(timestamp: number | string | Date, timezone: string, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) :
               typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  return formatInTimezone(date, timezone, options);
}
