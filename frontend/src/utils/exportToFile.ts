import { IS_ELECTRON } from './env';

const FORMAT_MIME: Record<'mp4' | 'mov' | 'webm', string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/**
 * onStart fires after the user confirms the save location but before the export
 * fetch begins — use it to show a loading indicator at the right moment.
 */
export async function exportToFile({
  backendUrl,
  body,
  suggestedName,
  format,
  electronDefaultPath,
  onStart,
}: {
  backendUrl: string;
  body: Record<string, unknown>;
  suggestedName: string;
  format: 'mp4' | 'mov' | 'webm';
  electronDefaultPath?: string;
  onStart?: () => void;
}): Promise<boolean> {
  if (IS_ELECTRON) {
    const outputPath = await window.electronAPI?.saveFile({
      defaultPath: electronDefaultPath ?? suggestedName,
      filters: [
        { name: 'MP4', extensions: ['mp4'] },
        { name: 'MOV', extensions: ['mov'] },
        { name: 'WebM', extensions: ['webm'] },
      ],
    });
    if (!outputPath) return false;

    onStart?.();
    const res = await fetch(`${backendUrl}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, output_path: outputPath }),
    });
    if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
    return true;
  }

  // Browser mode: pick save location, stream response directly to disk.
  let fileHandle: FileSystemFileHandle;
  try {
    fileHandle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'Video file',
        accept: { [FORMAT_MIME[format] ?? 'video/mp4']: [`.${format}`] },
      }],
    });
  } catch {
    return false; // user cancelled
  }

  onStart?.();
  const res = await fetch(`${backendUrl}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, output_path: '' }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

  const writable = await fileHandle.createWritable();
  try {
    await res.body!.pipeTo(writable);
  } catch (err) {
    await writable.abort();
    throw err;
  }
  return true;
}
