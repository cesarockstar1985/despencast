const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

const format = (level, msg) => `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;

const logger = {
    error: (msg, ...args) => { if (currentLevel >= LEVELS.error) console.error(format('error', msg), ...args); },
    warn:  (msg, ...args) => { if (currentLevel >= LEVELS.warn)  console.warn(format('warn',  msg), ...args); },
    info:  (msg, ...args) => { if (currentLevel >= LEVELS.info)  console.log(format('info',  msg), ...args); },
    debug: (msg, ...args) => { if (currentLevel >= LEVELS.debug) console.log(format('debug', msg), ...args); },
};

module.exports = logger;
