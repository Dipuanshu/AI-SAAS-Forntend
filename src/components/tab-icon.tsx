import { Ionicons } from '@expo/vector-icons';

export const tabIcon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} size={size} color={color as string} />;
