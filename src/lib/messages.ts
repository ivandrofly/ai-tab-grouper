// Shared between the service worker and the extension pages.

export const UNDO_KEY = 'undoStack';
export const RUN_KEY = 'run';

export interface UndoBatch {
  at: number;
  moves: { tabId: number; groupId: number }[];
}

export type RunState =
  | { status: 'running'; windowId: number; at: number; tabs: number }
  | { status: 'done'; windowId: number; at: number; message: string; groupIds: number[] }
  | { status: 'error'; windowId: number; at: number; message: string };

export type Message =
  | { type: 'group'; windowId: number }
  | { type: 'undo' }
  | { type: 'testKey'; apiKey: string; model: string };

export interface Replies {
  group: { message: string; moved: number };
  undo: { ungrouped: number; total: number };
  testKey: { name: string };
}

/** Sends a message to the service worker and rethrows any error it reports. */
export async function send<M extends Message>(msg: M): Promise<Replies[M['type']]> {
  const res = await chrome.runtime.sendMessage(msg);
  if (res?.error) throw new Error(res.error);
  return res;
}
