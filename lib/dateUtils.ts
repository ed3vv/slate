export const DateUtils = {
  fromString: (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  today: (): string => {
    return new Date().toLocaleDateString('en-CA');
  },

  format: (dateString: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string => {
    const date = DateUtils.fromString(dateString);
    return date.toLocaleDateString('en-US', options);
  },

  isSame: (date1String: string, date2String: string): boolean => {
    return date1String === date2String;
  },

  compare: (date1String: string, date2String: string): number => {
    if (date1String < date2String) return -1;
    if (date1String > date2String) return 1;
    return 0;
  }
};
