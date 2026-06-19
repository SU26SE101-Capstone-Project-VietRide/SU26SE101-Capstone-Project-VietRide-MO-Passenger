import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PaperPlaneRight, Robot } from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input } from '@shared/components';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function ChatbotScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const currentLang = i18n.language || 'vi';

  // Refs for flatlist scroll
  const flatListRef = useRef<FlatList>(null);

  // Initial messages setup based on language
  const getInitialMessages = useCallback((): Message[] => {
    const isVi = currentLang.startsWith('vi');
    return [
      {
        id: 'init-1',
        text: isVi
          ? 'Xin chào! Tôi là Trợ lý ảo VietRide. Tôi có thể giúp gì cho bạn hôm nay?'
          : 'Hello! I am your VietRide AI Assistant. How can I help you today?',
        sender: 'bot',
        timestamp: new Date(),
      },
    ];
  }, [currentLang]);

  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Sync initial messages when language changes
  useEffect(() => {
    setMessages(getInitialMessages());
  }, [getInitialMessages]);

  // Quick Action Chips definitions
  const quickActionChips = currentLang.startsWith('vi')
    ? [
      { label: '💵 Xem giá vé xe', value: 'price' },
      { label: '🎫 Hủy vé & Hoàn tiền', value: 'cancel' },
      { label: '📦 Cách thức gửi hàng', value: 'parcel' },
      { label: '📍 Theo dõi hành trình xe', value: 'track' },
    ]
    : [
      { label: '💵 Check Ticket Fares', value: 'price' },
      { label: '🎫 Cancellation & Refund', value: 'cancel' },
      { label: '📦 How to Send Parcel', value: 'parcel' },
      { label: '📍 Live Track My Bus', value: 'track' },
    ];

  // Auto-responses database
  const getBotResponse = (queryType: string, customText?: string): string => {
    const isVi = currentLang.startsWith('vi');

    if (queryType === 'price') {
      return isVi
        ? 'Giá vé VietRide dao động từ 150.000đ (xe giường nằm tiêu chuẩn) đến 280.000đ (Limousine VIP). Bạn có thể vào tab "Đặt vé" ở menu chính để tra cứu chính xác giá vé của từng chặng nhé!'
        : 'VietRide ticket fares start from only 150,000đ for standard sleeper buses and 280,000đ for premium VIP Limousines. You can search live pricing for any route under the "Booking" tab!';
    }

    if (queryType === 'cancel') {
      return isVi
        ? 'Bạn có thể hủy vé trực tiếp trên ứng dụng tối thiểu 24 tiếng trước giờ khởi hành. Hãy vào "Lịch sử" -> chọn vé điện tử của bạn -> bấm "Hủy vé". Phí xử lý hủy vé tiêu chuẩn là 10%.'
        : 'You can easily cancel and refund tickets up to 24 hours prior to departure. Simply go to "History" -> select your digital ticket -> tap "Cancel Ticket". A standard 10% processing fee will apply.';
    }

    if (queryType === 'parcel') {
      return isVi
        ? 'Gửi hàng cực kỳ dễ dàng với VietRide! Hãy chọn tab "Gửi hàng" (Parcel) ở menu chính, nhập kích thước bưu kiện, thông tin người gửi/nhận, sau đó đem hàng ra văn phòng nhà xe gần nhất để gửi.'
        : 'Sending a parcel is quick! Head over to the "Parcel" tab at the bottom menu, fill in package details, sender and receiver details, then drop the parcel off at your closest VietRide terminal.';
    }

    if (queryType === 'track') {
      return isVi
        ? 'Để xem vị trí xe chạy trực tiếp, bạn hãy truy cập tab "Theo dõi" (Tracking) ở menu dưới cùng, nhập mã vé của bạn (ví dụ: VR-88291) để theo dõi bản đồ GPS và ETA thời gian xe đến.'
        : 'To track your bus live, head to the "Tracking" tab at the bottom navigation, enter your Digital Ticket reference (e.g. VR-88291), and view the live GPS movement and arrival countdown clocks.';
    }

    // Default conversational fallback responses
    if (isVi) {
      if (customText?.toLowerCase().includes('hello') || customText?.toLowerCase().includes('chào')) {
        return 'Xin chào! Chúc bạn một ngày tốt lành. Tôi có thể hỗ trợ gì về thông tin chuyến đi hay gửi bưu kiện không?';
      }
      return 'Cảm ơn câu hỏi của bạn. Tôi đã ghi nhận yêu cầu và sẽ hỗ trợ ngay. Bạn có muốn tra cứu giá vé hay cách hủy vé qua các gợi ý bên dưới không?';
    } else {
      if (customText?.toLowerCase().includes('hello') || customText?.toLowerCase().includes('hi')) {
        return 'Hello there! Hope you are having a wonderful day. How can I assist you with your trips or parcel bookings?';
      }
      return 'Thank you for your message. I have received your request. Would you like to check fare prices or ticket cancellation guidelines using the shortcut chips below?';
    }
  };

  const handleSendMessage = async (text: string, isPresetCode?: string) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Auto Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // 2. Trigger Typing Status
    setIsTyping(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));

    // 3. Add AI bot Response
    const botReplyText = getBotResponse(isPresetCode || '', text);
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: botReplyText,
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);

    // Auto Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.botInfo}>
            <View style={styles.botAvatar}>
              <Robot size={20} color={colors.textInverse} weight="fill" />
            </View>
            <View>
              <Text style={styles.botName}>VietRide AI Helper</Text>
              <Text style={styles.botStatus}>{t('chatbot.online', 'Online')}</Text>
            </View>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Message bubbles list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.botRow,
                ]}
              >
                {!isUser && (
                  <View style={styles.bubbleBotAvatar}>
                    <Robot size={14} color={colors.primary} weight="bold" />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.timestampText, isUser ? styles.userTimestamp : styles.botTimestamp]}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isTyping ? (
              <View style={[styles.messageRow, styles.botRow]}>
                <View style={styles.bubbleBotAvatar}>
                  <Robot size={14} color={colors.primary} weight="bold" />
                </View>
                <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggestions Quick Action Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContent}
          >
            {quickActionChips.map((chip) => (
              <TouchableOpacity
                key={chip.value}
                style={styles.chipButton}
                onPress={() => handleSendMessage(chip.label, chip.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipLabel}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Text Input Bar */}
        <View style={styles.inputBar}>
          <Input
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chatbot.askPlaceholder', 'Ask a question...')}
            containerStyle={styles.textInputContainer}
            onSubmitEditing={() => handleSendMessage(inputText)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.disabledSendButton,
            ]}
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <PaperPlaneRight size={20} color={colors.textInverse} weight="fill" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  botName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  botStatus: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.success,
    marginTop: 1,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  messageListContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  bubbleBotAvatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  botBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  typingBubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.textInverse,
  },
  botMessageText: {
    color: colors.textPrimary,
  },
  timestampText: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  botTimestamp: {
    color: colors.textTertiary,
  },
  chipsContainer: {
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  chipsScrollContent: {
    paddingHorizontal: spacing.xl,
  },
  chipButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  chipLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  textInputContainer: {
    flex: 1,
    marginBottom: 0,
    marginRight: spacing.md,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  disabledSendButton: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
  },
});
