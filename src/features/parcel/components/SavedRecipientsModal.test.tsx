import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSavedRecipientsStore } from '../store/useSavedRecipientsStore';
import { SavedRecipientsModal } from './SavedRecipientsModal';

const mockTheme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    primary: '#007D78',
    primaryFaded: 'rgba(0, 125, 120, 0.1)',
    warningLight: '#FEF3C7',
    warningForeground: '#D97706',
    error: '#EF4444',
  },
  components: {
    primaryButton: {
      borderRadius: 8,
      height: 48,
    },
    card: {
      backgroundColor: '#FFFFFF',
    },
  },
  isDark: false,
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    AddressBook: MockIcon,
    ArrowLeft: MockIcon,
    Check: MockIcon,
    MagnifyingGlass: MockIcon,
    PencilSimple: MockIcon,
    Plus: MockIcon,
    Star: MockIcon,
    Trash: MockIcon,
    X: MockIcon,
  };
});

jest.mock('react-native-keyboard-controller', () => {
  const { View } = require('react-native');
  return {
    KeyboardAvoidingView: View,
    KeyboardAwareScrollView: View,
  };
}, { virtual: true });

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SavedRecipientsModal', () => {
  beforeEach(() => {
    useSavedRecipientsStore.getState().reset();
    useSavedRecipientsStore.setState({
      recipients: [
        {
          id: 'rec_1',
          fullName: 'Nguyễn Văn A',
          phoneNumber: '0901234567',
          email: 'a@example.com',
          isDefault: true,
          lastUsedAt: 2000,
          createdAt: 1000,
        },
        {
          id: 'rec_2',
          fullName: 'Trần Thị B',
          phoneNumber: '0909876543',
          email: 'b@example.com',
          isDefault: false,
          lastUsedAt: 1000,
          createdAt: 1000,
        },
      ],
      isLoaded: true,
    });
  });

  it('renders recipient items when visible', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <SavedRecipientsModal
          visible={true}
          onClose={jest.fn()}
          mode="picker"
        />,
      );
    });

    const modal = renderer!.root.findByProps({ testID: 'saved-recipients-modal' });
    expect(modal).toBeTruthy();

    const item1 = renderer!.root.findByProps({ testID: 'saved-recipient-item-rec_1' });
    const item2 = renderer!.root.findByProps({ testID: 'saved-recipient-item-rec_2' });
    expect(item1).toBeTruthy();
    expect(item2).toBeTruthy();
  });

  it('calls onSelectRecipient when a recipient card is pressed in picker mode', () => {
    const onSelectRecipient = jest.fn();
    const onClose = jest.fn();

    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <SavedRecipientsModal
          visible={true}
          onClose={onClose}
          onSelectRecipient={onSelectRecipient}
          mode="picker"
        />,
      );
    });

    const item1 = renderer!.root.findByProps({ testID: 'saved-recipient-item-rec_1' });
    act(() => {
      item1.props.onPress();
    });

    expect(onSelectRecipient).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rec_1',
        fullName: 'Nguyễn Văn A',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('filters recipients when search query changes', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <SavedRecipientsModal
          visible={true}
          onClose={jest.fn()}
          mode="picker"
        />,
      );
    });

    const searchInput = renderer!.root.findByProps({
      testID: 'saved-recipients-search-input',
    });

    act(() => {
      searchInput.props.onChangeText('Trần Thị');
    });

    expect(
      renderer!.root.findAllByProps({ testID: 'saved-recipient-item-rec_1' }),
    ).toHaveLength(0);
    expect(
      renderer!.root.findByProps({ testID: 'saved-recipient-item-rec_2' }),
    ).toBeTruthy();
  });

  it('switches to add form when add button is pressed', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <SavedRecipientsModal
          visible={true}
          onClose={jest.fn()}
          mode="picker"
        />,
      );
    });

    const addButton = renderer!.root.findByProps({
      testID: 'saved-recipients-add-button',
    });

    act(() => {
      addButton.props.onPress();
    });

    // Form inputs should now be present
    expect(
      renderer!.root.findAllByProps({ testID: 'saved-recipients-search-input' }),
    ).toHaveLength(0);
  });
});
