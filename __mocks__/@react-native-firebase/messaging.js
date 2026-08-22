const unsubscribe = () => undefined;

module.exports = {
  __esModule: true,
  deleteToken: jest.fn(async () => undefined),
  getInitialNotification: jest.fn(async () => null),
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'test-fcm-token'),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
  onMessage: jest.fn(() => unsubscribe),
  onNotificationOpenedApp: jest.fn(() => unsubscribe),
  onTokenRefresh: jest.fn(() => unsubscribe),
  registerDeviceForRemoteMessages: jest.fn(async () => undefined),
  setAutoInitEnabled: jest.fn(async () => undefined),
  setBackgroundMessageHandler: jest.fn(),
};
