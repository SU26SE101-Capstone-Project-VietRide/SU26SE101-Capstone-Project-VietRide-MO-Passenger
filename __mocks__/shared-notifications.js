const unsubscribe = () => undefined;

module.exports = {
  cancelDailyReminder: jest.fn(async () => undefined),
  clearPendingNotificationOpen: jest.fn(async () => undefined),
  consumePendingNotificationOpen: jest.fn(async () => null),
  displayForegroundRemoteNotification: jest.fn(async () => undefined),
  ensureNotificationChannels: jest.fn(async () => undefined),
  getCurrentFcmToken: jest.fn(async () => null),
  getInitialLocalNotification: jest.fn(async () => null),
  getInitialRemoteNotification: jest.fn(async () => null),
  getNotificationPermissionState: jest.fn(async () => 'notDetermined'),
  isNativePushConfigured: jest.fn(() => false),
  isNotificationPressEvent: jest.fn(() => false),
  openSystemNotificationSettings: jest.fn(async () => undefined),
  requestNotificationPermission: jest.fn(async () => 'notDetermined'),
  revokeDeviceRegistration: jest.fn(async () => undefined),
  scheduleDailyReminder: jest.fn(async () => undefined),
  subscribeToFcmTokenRefresh: jest.fn(() => unsubscribe),
  subscribeToForegroundRemoteMessages: jest.fn(() => unsubscribe),
  subscribeToLocalNotificationEvents: jest.fn(() => unsubscribe),
  subscribeToOpenedRemoteMessages: jest.fn(() => unsubscribe),
  synchronizeDeviceRegistration: jest.fn(async () => undefined),
};
