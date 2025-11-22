export enum LogLabel {
  INFO = 'info',
  LOG = 'log',
  PAIRING = 'pairing',
  ERROR = 'error',
  WARNING = 'warning',
  DEBUG = 'debug',
  TELEMETRY = 'telemetry',
  COMMAND = 'command',
  RESPONSE = 'response',
  EVENT = 'event',  // Device events/feedback (e.g., relay_ack, relay_error)
}
