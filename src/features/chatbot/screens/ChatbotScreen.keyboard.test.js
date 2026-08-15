const fs = require('fs');
const path = require('path');

const screenSource = fs.readFileSync(
  path.join(__dirname, 'ChatbotScreen.tsx'),
  'utf8',
);

describe('ChatbotScreen keyboard layout contract', () => {
  it('enables Keyboard Controller avoidance on both platforms', () => {
    expect(screenSource).toContain('<KeyboardAvoidingView');
    expect(screenSource).toContain('behavior="translate-with-padding"');
    expect(screenSource).toContain('style={styles.composerKeyboardView}');
    expect(screenSource).not.toContain(
      "Platform.OS === 'ios' ? 'padding' : undefined",
    );
  });

  it('keeps messages in a bounded viewport without keyboard visibility re-renders', () => {
    expect(screenSource).toContain('style={styles.messageList}');
    expect(screenSource).toContain('minHeight: 0');
    expect(screenSource).not.toContain('useKeyboardState');
    expect(screenSource).not.toContain('isKeyboardVisible');
  });

  it('places quick actions inside the chat flow and dismisses them after interaction', () => {
    expect(screenSource).toContain('ListFooterComponent={showQuickActions ? (');
    expect(screenSource).toContain('setQuickActionsDismissed(true)');
    expect(screenSource).toContain("messages[0]?.id === 'welcome'");
  });
});
