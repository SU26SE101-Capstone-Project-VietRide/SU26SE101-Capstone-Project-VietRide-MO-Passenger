import { chatMarkdownPlainText, parseChatMarkdown, parseChatMarkdownInline } from './chatMarkdown';

describe('chatMarkdown', () => {
  it('turns complete **bold** markers into bold spans and drops leftovers', () => {
    expect(parseChatMarkdownInline('Hoàn **80%** phí.')).toEqual([
      { text: 'Hoàn ' },
      { text: '80%', bold: true },
      { text: ' phí.' },
    ]);
    expect(chatMarkdownPlainText('**Chưa đóng**')).toBe('Chưa đóng');
    expect(chatMarkdownPlainText('**đang gõ')).toBe('đang gõ');
  });

  it('keeps list items and headings without markdown markers', () => {
    const blocks = parseChatMarkdown([
      '## Chính sách',
      '',
      '- **Trước 24 giờ**: hoàn 80%',
      '- Sau 24 giờ: không hoàn',
      '',
      'Xem [điều khoản](https://example.com).',
    ].join('\n'));

    expect(blocks).toEqual([
      {
        type: 'heading',
        level: 2,
        spans: [{ text: 'Chính sách' }],
      },
      {
        type: 'list',
        ordered: false,
        items: [
          [
            { text: 'Trước 24 giờ', bold: true },
            { text: ': hoàn 80%' },
          ],
          [{ text: 'Sau 24 giờ: không hoàn' }],
        ],
      },
      {
        type: 'paragraph',
        spans: [{ text: 'Xem điều khoản.' }],
      },
    ]);
  });
});
