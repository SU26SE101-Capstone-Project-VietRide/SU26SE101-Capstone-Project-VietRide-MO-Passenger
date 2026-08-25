const noopSubscription = () => () => undefined;

const notifee = {
  cancelTriggerNotification: jest.fn(async () => undefined),
  createChannel: jest.fn(async (channel) => channel.id),
  createTriggerNotification: jest.fn(async () => undefined),
  displayNotification: jest.fn(async () => undefined),
  getInitialNotification: jest.fn(async () => null),
  getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1 })),
  onBackgroundEvent: jest.fn(),
  onForegroundEvent: jest.fn(noopSubscription),
  openNotificationSettings: jest.fn(async () => undefined),
  requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
  EventType: { DISMISSED: 0, PRESS: 1, ACTION_PRESS: 2 },
  RepeatFrequency: { DAILY: 0 },
  TriggerType: { TIMESTAMP: 0 },
};
