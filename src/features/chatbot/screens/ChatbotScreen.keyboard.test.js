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
    expect(screenSource).toContain('minHeight: 0');
    expect(screenSource).not.toContain('useKeyboardState');
    expect(screenSource).not.toContain('isKeyboardVisible');
  });

  it('dismisses quick actions after interaction', () => {
    expect(screenSource).toContain('setQuickActionsDismissed(true)');
  });

  it('opens on the latest chat, not the top of an empty list', () => {
    expect(screenSource).toContain("justifyContent: 'flex-end'");
    expect(screenSource).toContain('flexGrow: 1');
    expect(screenSource).toContain('onLoad={handleListReady}');
    expect(screenSource).toContain('scrollToEnd');
  });
});
