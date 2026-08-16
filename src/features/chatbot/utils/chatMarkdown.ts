export interface ChatMarkdownSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export type ChatMarkdownBlock =
  | { type: 'paragraph'; spans: ChatMarkdownSpan[] }
  | { type: 'heading'; level: 1 | 2 | 3; spans: ChatMarkdownSpan[] }
  | { type: 'list'; ordered: boolean; items: ChatMarkdownSpan[][] };

const ORDERED_ITEM = /^(\d+)[.)]\s+(.*)$/;
const UNORDERED_ITEM = /^[-*+]\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;

const pushSpan = (
  spans: ChatMarkdownSpan[],
  text: string,
  mark?: Pick<ChatMarkdownSpan, 'bold' | 'italic' | 'code'>,
): void => {
  if (!text) return;
  const last = spans.at(-1);
  if (
    last
    && Boolean(last.bold) === Boolean(mark?.bold)
    && Boolean(last.italic) === Boolean(mark?.italic)
    && Boolean(last.code) === Boolean(mark?.code)
  ) {
    last.text += text;
    return;
  }
  spans.push({ text, ...mark });
};

const findUnescaped = (value: string, token: string, from: number): number => {
  let index = from;
  while (index < value.length) {
    const found = value.indexOf(token, index);
    if (found === -1) return -1;
    if (found === 0 || value[found - 1] !== '\\') return found;
    index = found + token.length;
  }
  return -1;
};

export const parseChatMarkdownInline = (input: string): ChatMarkdownSpan[] => {
  const spans: ChatMarkdownSpan[] = [];
  let index = 0;

  while (index < input.length) {
    if (input.startsWith('**', index) || input.startsWith('__', index)) {
      const marker = input.slice(index, index + 2);
      const close = findUnescaped(input, marker, index + 2);
      if (close === -1) {
        index += 2;
        continue;
      }
      pushSpan(spans, input.slice(index + 2, close), { bold: true });
      index = close + 2;
      continue;
    }

    if (input[index] === '*') {
      const close = findUnescaped(input, '*', index + 1);
      if (close === -1 || close === index + 1) {
        index += 1;
        continue;
      }
      pushSpan(spans, input.slice(index + 1, close), { italic: true });
      index = close + 1;
      continue;
    }

    if (input[index] === '`') {
      const close = input.indexOf('`', index + 1);
      if (close === -1) {
        index += 1;
        continue;
      }
      pushSpan(spans, input.slice(index + 1, close), { code: true });
      index = close + 1;
      continue;
    }

    if (input.startsWith('[', index)) {
      const labelEnd = input.indexOf('](', index + 1);
      const urlEnd = labelEnd === -1 ? -1 : input.indexOf(')', labelEnd + 2);
      if (labelEnd !== -1 && urlEnd !== -1) {
        pushSpan(spans, input.slice(index + 1, labelEnd));
        index = urlEnd + 1;
        continue;
      }
    }

    const nextMark = input.slice(index).search(/(\*\*|__|\*|`|\[)/);
    const plainEnd = nextMark === -1 ? input.length : index + nextMark;
    pushSpan(spans, input.slice(index, plainEnd).replace(/\\([*_`[\]])/g, '$1'));
    index = plainEnd;
  }

  return spans;
};

const parseListItem = (line: string): {
  ordered: boolean;
  text: string;
} | null => {
  const ordered = line.match(ORDERED_ITEM);
  if (ordered) return { ordered: true, text: ordered[2] ?? '' };
  const unordered = line.match(UNORDERED_ITEM);
  if (unordered) return { ordered: false, text: unordered[1] ?? '' };
  return null;
};

export const parseChatMarkdown = (input: string): ChatMarkdownBlock[] => {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: ChatMarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    const spans = parseChatMarkdownInline(paragraph.join('\n'));
    paragraph = [];
    if (spans.length === 0) return;
    blocks.push({ type: 'paragraph', spans });
  };

  const flushList = (): void => {
    if (!list || list.items.length === 0) {
      list = null;
      return;
    }
    blocks.push({
      type: 'list',
      ordered: list.ordered,
      items: list.items.map(item => parseChatMarkdownInline(item)),
    });
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1]?.length ?? 1, 3) as 1 | 2 | 3;
      const spans = parseChatMarkdownInline(heading[2] ?? '');
      if (spans.length > 0) blocks.push({ type: 'heading', level, spans });
      continue;
    }

    const item = parseListItem(trimmed);
    if (item) {
      flushParagraph();
      if (!list || list.ordered !== item.ordered) {
        flushList();
        list = { ordered: item.ordered, items: [] };
      }
      list.items.push(item.text);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
};

export const chatMarkdownPlainText = (input: string): string =>
  parseChatMarkdownInline(input).map(span => span.text).join('');
