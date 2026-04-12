import { IS_ELECTRON } from './env';

const FORMAT_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/**
 * Show a save dialog, POST to /export, and write the result to the chosen location.
 * Returns true if saved, false if the user cancelled the picker.
 * Throws on network or write errors.
 *
 * onStart is called after the picker resolves but before the export fetch begins,
 * so callers can show a loading indicator only once the user has confirmed.
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
  format: string;
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
