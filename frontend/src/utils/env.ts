import type { BackendStatus } from '../types/project';

export const IS_ELECTRON = !!window.electronAPI;

export const BACKEND_STATUS_LABEL: Record<BackendStatus, string> = {
  online:   'Online',
  offline:  'Offline',
  checking: 'Connecting…',
};

export async function startBackend(): Promise<void> {
  if (IS_ELECTRON) {
    await window.electronAPI!.restartBackend();
  } else {
    await fetch('/api/start-backend', { method: 'POST' });
  }
}
