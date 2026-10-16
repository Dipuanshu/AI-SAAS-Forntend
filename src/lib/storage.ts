import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Native: encrypted keychain/keystore. Web: localStorage (SecureStore is unavailable there).
export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return window.localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* storage unavailable: session just won't persist */
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') window.localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}
