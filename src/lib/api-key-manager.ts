'use client';

import { getApiKeys } from '@/lib/db';

const TEST_MODE_SUFFIX = '_TEST_MODE_360';

export async function isTestModeActive(): Promise<boolean> {
  const apiKeys = await getApiKeys();
  const validKeys = apiKeys.groq?.filter(Boolean) || [];
  if (validKeys.length === 0) return false;
  return validKeys.every(key => key.endsWith(TEST_MODE_SUFFIX));
}
