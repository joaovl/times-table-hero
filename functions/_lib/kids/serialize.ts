import type { Kid } from './types';

export interface SerializedKid {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

/** Strips internal fields (accountId, and any PIN data) before a kid reaches a client. */
export function serializeKid(k: Kid): SerializedKid {
  return { id: k.id, name: k.name, color: k.color, icon: k.icon, createdAt: k.createdAt };
}
