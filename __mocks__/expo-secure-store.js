/**
 * Jest manual mock for expo-secure-store.
 * Uses an in-memory map to simulate SecureStore behaviour in test environments.
 * Never leaks real device keychain — keeps production fail-fast logic intact.
 */

const store = new Map();

const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'when_unlocked_this_device_only';
const WHEN_UNLOCKED = 'when_unlocked';
const AFTER_FIRST_UNLOCK = 'after_first_unlock';
const ALWAYS = 'always';
const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'when_passcode_set_this_device_only';

const defaultGetItemAsync = async key => store.get(key) ?? null;
const defaultSetItemAsync = async (key, value) => {
  store.set(key, value);
};
const defaultDeleteItemAsync = async key => {
  store.delete(key);
};
const defaultIsAvailableAsync = async () => true;

const getItemAsync = jest.fn(defaultGetItemAsync);
const setItemAsync = jest.fn(defaultSetItemAsync);
const deleteItemAsync = jest.fn(defaultDeleteItemAsync);
const isAvailableAsync = jest.fn(defaultIsAvailableAsync);

// Reset both persisted values and Jest observations for strict test isolation.
const __resetStore = () => {
  store.clear();
  getItemAsync.mockReset().mockImplementation(defaultGetItemAsync);
  setItemAsync.mockReset().mockImplementation(defaultSetItemAsync);
  deleteItemAsync.mockReset().mockImplementation(defaultDeleteItemAsync);
  isAvailableAsync.mockReset().mockImplementation(defaultIsAvailableAsync);
};

module.exports = {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  WHEN_UNLOCKED,
  AFTER_FIRST_UNLOCK,
  ALWAYS,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  __resetStore,
};
