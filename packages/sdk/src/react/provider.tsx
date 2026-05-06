import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { AuthClient } from '../clients/auth/client.js';
import { LeadClient } from '../clients/lead/client.js';
import { HttpClient } from '../core/http-client.js';
import { createBrowserTokenStorage } from '../core/auth.js';

export interface KianaSDK {
  auth: AuthClient;
  leads: LeadClient;
}

const SdkContext = createContext<KianaSDK | null>(null);

export interface KianaSDKProviderProps {
  baseUrl?: string;
  children: ReactNode;
}

export function KianaSDKProvider({ baseUrl, children }: KianaSDKProviderProps): JSX.Element {
  const sdk = useMemo<KianaSDK>(() => {
    const http = new HttpClient({
      baseUrl: baseUrl ?? '',
      tokenStorage: createBrowserTokenStorage(),
    });
    return {
      auth: new AuthClient(http),
      leads: new LeadClient(http),
    };
  }, [baseUrl]);

  return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>;
}

export function useSdk(): KianaSDK {
  const sdk = useContext(SdkContext);
  if (!sdk) {
    throw new Error('useSdk() called outside of <KianaSDKProvider>');
  }
  return sdk;
}
