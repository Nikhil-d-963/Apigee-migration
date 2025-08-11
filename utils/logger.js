/**
 * Standardized logger utility for Apigee Migration CLI
 * Provides consistent logging format and styling across the application
 */
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const figures = require('figures');

// ANSI escape codes for cursor control
const cursorHide = '\u001B[?25l';
const cursorShow = '\u001B[?25h';

// Define log levels
const LOG_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  DEBUG: 'debug'
};

// Define symbols for different log types
const SYMBOLS = {
  info: figures.info,
  success: figures.tick,
  warning: figures.warning,
  error: figures.cross,
  debug: figures.pointer
};

// Define colors for different log types
const COLORS = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.magenta
};

/**
 * Format a log message with timestamp, symbol, and color
 * @param {string} message - The message to log
 * @param {string} level - The log level
 * @returns {string} - The formatted log message
 */
const formatLogMessage = (message, level = 'info') => {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\.+/, '');
  const symbol = SYMBOLS[level] || figures.info;
  const color = COLORS[level] || chalk.blue;
  const levelText = level.toUpperCase().padEnd(7);
  
  return `${chalk.dim(timestamp)} ${color(levelText)} ${symbol} ${color(message)}`;
};

/**
 * Create a standardized progress bar
 * @param {string} task - Description of the task
 * @param {object} options - Additional options for the progress bar
 * @returns {object} - The progress bar instance
 */
const createProgressBar = (task, options = {}) => {
  // Hide cursor during progress bar display
  process.stdout.write(cursorHide);
  
  const defaultOptions = {
    format: `${chalk.cyan('{bar}')} {percentage}% | {value}/{total} | ${chalk.cyan(task)}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
    clearOnComplete: false,
    stopOnComplete: true
  };
  
  const progressBar = new cliProgress.SingleBar({
    ...defaultOptions,
    ...options
  });
  
  // Show cursor when progress bar completes
  progressBar.on('stop', () => {
    process.stdout.write(cursorShow);
  });
  
  return progressBar;
};

/**
 * Create a multi-progress bar for tracking multiple tasks
 * @returns {object} - The multi-progress bar instance
 */
const createMultiProgressBar = () => {
  // Hide cursor during progress bar display
  process.stdout.write(cursorHide);
  
  const multiBar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: `${chalk.cyan('{bar}')} {percentage}% | {value}/{total} | ${chalk.cyan('{task}')}`,
    barCompleteChar: '█',
    barIncompleteChar: '░'
  });
  
  // Show cursor when all progress bars complete
  multiBar.on('stop', () => {
    process.stdout.write(cursorShow);
  });
  
  return multiBar;
};

/**
 * Print a section header
 * @param {string} title - The section title
 */
const printSection = (title) => {
  const line = '─'.repeat(Math.max(0, 80 - title.length - 4));
  console.log(`\n${chalk.bold.cyan('┌── ' + title + ' ' + line)}`);
};

/**
 * Print a section footer
 */
const printSectionEnd = () => {
  console.log(`${chalk.bold.cyan('└' + '─'.repeat(79))}\n`);
};

/**
 * Print a summary table
 * @param {object} data - The data to display in the summary
 * @param {string} title - The summary title
 */
const printSummary = (data, title = 'Summary') => {
  printSection(title);
  
  Object.entries(data).forEach(([key, value]) => {
    let color = chalk.white;
    
    if (key.toLowerCase().includes('success')) {
      color = chalk.green;
    } else if (key.toLowerCase().includes('fail') || key.toLowerCase().includes('error')) {
      color = chalk.red;
    } else if (key.toLowerCase().includes('skip') || key.toLowerCase().includes('warn')) {
      color = chalk.yellow;
    }
    
    console.log(`  ${chalk.dim('•')} ${key}: ${color(value)}`);
  });
  
  printSectionEnd();
};

// Logger methods
const logger = {
  info: (message) => console.log(formatLogMessage(message, 'info')),
  success: (message) => console.log(formatLogMessage(message, 'success')),
  warning: (message) => console.log(formatLogMessage(message, 'warning')),
  error: (message) => console.error(formatLogMessage(message, 'error')),
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(formatLogMessage(message, 'debug'));
    }
  },
  
  // Progress bar methods
  createProgressBar,
  createMultiProgressBar,
  
  // Section and summary methods
  printSection,
  printSectionEnd,
  printSummary,
  
  // Banner for application start
  printBanner: () => {
    console.log('\n' + chalk.bold.cyan('╔════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                          APIGEE MIGRATION CLI                                ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════════════════════╝\n'));
  }
};

module.exports = logger;
