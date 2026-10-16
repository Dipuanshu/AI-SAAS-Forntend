import { Fragment, ReactNode } from 'react';
import { Platform, StyleProp, Text, TextStyle, View } from 'react-native';
import { colors } from '../lib/theme';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' });

/** Inline formatting: **bold** and `code`. */
function inline(text: string, base: StyleProp<TextStyle>): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<Text key={i++} style={{ fontWeight: '700' }}>{tok.slice(2, -2)}</Text>);
    else out.push(<Text key={i++} style={{ fontFamily: MONO, backgroundColor: '#F1F5F9', fontSize: 13 }}>{tok.slice(1, -1)}</Text>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  void base;
  return out;
}

/** Small renderer for assistant answers and guide text: paragraphs, "- " bullets, **bold**, `code`. */
export function RichText({ text, color = colors.text, size = 15 }: { text: string; color?: string; size?: number }) {
  const base: TextStyle = { color, fontSize: size, lineHeight: size * 1.45 };
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, idx) => {
        if (!line.trim()) return <View key={idx} style={{ height: 6 }} />;
        const bullet = /^\s*[-•*]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <View key={idx} style={{ flexDirection: 'row', marginVertical: 1 }}>
              <Text style={[base, { width: 16 }]}>•</Text>
              <Text style={[base, { flex: 1 }]} selectable>{inline(bullet[1]!, base)}</Text>
            </View>
          );
        }
        return <Text key={idx} style={base} selectable>{inline(line, base)}</Text>;
      })}
    </View>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <View style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 12, marginTop: 8 }}>
      <Text selectable style={{ color: '#E2E8F0', fontFamily: MONO, fontSize: 12.5, lineHeight: 18 }}>{code}</Text>
    </View>
  );
}
