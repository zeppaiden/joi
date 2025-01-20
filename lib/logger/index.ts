const colors = {
  debug: "\x1b[34m", // Blue
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m", // Reset
};

const emojis = {
  debug: "🔍",
  info: "ℹ️ ",
  warn: "⚠️ ",
  error: "❌",
};

// Detect if we're on the client side
const isClient = typeof window !== "undefined";

const logger = {
  debug: (...args: unknown[]) => {
    // Debug only shows in development
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        colors.debug,
        `${emojis.debug} [DEBUG${isClient ? ":CLIENT" : ":SERVER"}] ${new Date().toISOString()}`,
        colors.reset,
        ...args,
      );
    }
  },

  info: (...args: unknown[]) => {
    // In production, only log on server
    if (process.env.NODE_ENV !== "production" || !isClient) {
      const msg =
        process.env.NODE_ENV === "production"
          ? new Date().toISOString()
          : `${colors.info}${emojis.info} [INFO${isClient ? ":CLIENT" : ":SERVER"}] ${new Date().toISOString()}${colors.reset}`;

      console.log(msg, ...args);
    }
  },

  warn: (...args: unknown[]) => {
    // In production, only log on server
    if (process.env.NODE_ENV !== "production" || !isClient) {
      const msg =
        process.env.NODE_ENV === "production"
          ? new Date().toISOString()
          : `${colors.warn}${emojis.warn} [WARN${isClient ? ":CLIENT" : ":SERVER"}] ${new Date().toISOString()}${colors.reset}`;

      console.warn(msg, ...args);
    }
  },

  error: (error: unknown, context?: Record<string, unknown>) => {
    // In production, only log on server
    if (process.env.NODE_ENV !== "production" || !isClient) {
      const errorObject = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
      };

      const msg =
        process.env.NODE_ENV === "production"
          ? new Date().toISOString()
          : `${colors.error}${emojis.error} [ERROR${isClient ? ":CLIENT" : ":SERVER"}] ${new Date().toISOString()}${colors.reset}`;

      console.error(msg, errorObject);
    }
  },
};

export default logger;
