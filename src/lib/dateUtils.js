export const DateUtils = {
  fromString: (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  },
  
  today: () => {
    return new Date().toLocaleDateString('en-CA');
  },
  
  format: (dateString, options = { month: 'short', day: 'numeric' }) => {
    const date = DateUtils.fromString(dateString);
    return date.toLocaleDateString('en-US', options);
  },
  
  isSame: (date1String, date2String) => {
    return date1String === date2String;
  },
  
  compare: (date1String, date2String) => {
    if (date1String < date2String) return -1;
    if (date1String > date2String) return 1;
    return 0;
  }
};