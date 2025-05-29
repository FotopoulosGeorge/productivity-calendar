// src/utils/dateUtils.js

/**
 * Returns the first day (Sunday) of the week for a given date
 * @param {Date} date - The date to get the start of week for
 * @returns {Date} The start of the week (Sunday)
 */
export const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

/**
 * Formats a date as a string key for storage
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatDateKey = (date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

/**
 * Checks if two dates are the same day
 * @param {Date} date1 - First date to compare
 * @param {Date} date2 - Second date to compare
 * @returns {boolean} True if dates are the same day
 */
export const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Gets an array of dates for the current week
 * @param {Date} currentDate - The current reference date
 * @returns {Array} Array of Date objects for the week
 */
export const getWeekDates = (currentDate) => {
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }
  
  return weekDates;
};

/**
 * Formats a date for display
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "Mon, May 15")
 */
export const formatDateForDisplay = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};