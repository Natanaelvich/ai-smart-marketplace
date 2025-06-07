import fs from 'fs';
import path from 'path';

// Cores ANSI para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

type LogLevel = 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING' | 'TEST';

class Logger {
  private logFile: string;

  constructor() {
    const logsDir = path.join(process.cwd(), 'tests', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(logsDir, `test-${timestamp}.log`);
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case 'SUCCESS':
        return colors.green;
      case 'ERROR':
        return colors.red;
      case 'WARNING':
        return colors.yellow;
      case 'TEST':
        return colors.cyan;
      case 'INFO':
      default:
        return colors.blue;
    }
  }

  private formatConsoleMessage(
    level: LogLevel,
    message: string,
    data?: any
  ): string {
    const color = this.getColorForLevel(level);
    const timestamp = colors.gray + this.formatTimestamp() + colors.reset;
    const levelTag = color + colors.bright + `[${level}]` + colors.reset;
    const formattedMessage = colors.white + message + colors.reset;

    let output = `${timestamp} ${levelTag} ${formattedMessage}`;

    if (data) {
      const dataStr =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      output += '\n' + colors.dim + dataStr + colors.reset;
    }

    return output;
  }

  private formatFileMessage(
    level: LogLevel,
    message: string,
    data?: any
  ): string {
    const timestamp = this.formatTimestamp();
    let output = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      const dataStr =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      output += '\n' + dataStr;
    }

    return output + '\n';
  }

  private writeToFile(content: string): void {
    fs.appendFileSync(this.logFile, content);
  }

  log(level: LogLevel, message: string, data?: any): void {
    const consoleMessage = this.formatConsoleMessage(level, message, data);
    const fileMessage = this.formatFileMessage(level, message, data);

    console.log(consoleMessage);
    this.writeToFile(fileMessage);
  }

  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  success(message: string, data?: any): void {
    this.log('SUCCESS', message, data);
  }

  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  warning(message: string, data?: any): void {
    this.log('WARNING', message, data);
  }

  test(message: string, data?: any): void {
    this.log('TEST', message, data);
  }

  separator(): void {
    const line = colors.gray + '─'.repeat(80) + colors.reset;
    console.log(line);
    this.writeToFile('─'.repeat(80) + '\n');
  }

  header(title: string): void {
    const line = '═'.repeat(80);
    const paddedTitle = ` ${title} `;
    const padding = Math.max(0, (80 - paddedTitle.length) / 2);
    const centeredTitle =
      '═'.repeat(Math.floor(padding)) +
      paddedTitle +
      '═'.repeat(Math.ceil(padding));

    const coloredHeader =
      colors.cyan +
      colors.bright +
      line +
      '\n' +
      centeredTitle +
      '\n' +
      line +
      colors.reset;
    const fileHeader = line + '\n' + centeredTitle + '\n' + line + '\n';

    console.log(coloredHeader);
    this.writeToFile(fileHeader);
  }
}

export const logger = new Logger();
