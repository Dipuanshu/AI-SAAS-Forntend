import { Platform, Share } from 'react-native';
import { toast } from './toast';

/** Copies text on web; on phones opens the share sheet (no extra native module needed). */
export async function copyText(text: string, what = 'Copied'): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast(what);
      return;
    }
    await Share.share({ message: text });
  } catch {
    toast('Could not copy. Select the text and copy it manually.', 'error');
  }
}
