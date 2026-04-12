import { useEffect, useState } from 'react';
import { useEditorStore } from './store/editorStore';
import VideoPlayer from './components/VideoPlayer';
import TranscriptEditor from './components/TranscriptEditor';
import WaveformTimeline from './components/WaveformTimeline';
import AIPanel from './components/AIPanel';
import ExportDialog from './components/ExportDialog';
import SettingsPanel from './components/SettingsPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  Film,
  FolderOpen,
  Settings,
  Sparkles,
  Download,
  Loader2,
  FileInput,
} from 'lucide-react';

const IS_ELECTRON = !!window.electronAPI;

type Panel = 'ai' | 'settings' | 'export' | null;

export default function App() {
  const {
    videoPath,
    words,
    isTranscribing,
    transcriptionProgress,
    loadVideo,
    setBackendUrl,
    setTranscription,
    setTranscribing,
    backendUrl,
  } = useEditorStore();

  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [whisperModel, setWhisperModel] = useState('base');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useKeyboardShortcuts();

  useEffect(() => {
    if (IS_ELECTRON) {
      window.electronAPI!.getBackendUrl().then(setBackendUrl);
    }
  }, [setBackendUrl]);

  const handleLoadProject = async () => {
    if (!IS_ELECTRON) return;
    try {
      const projectPath = await window.electronAPI!.openProject();
      if (!projectPath) return;
      const content = await window.electronAPI!.readFile(projectPath);
      const data = JSON.parse(content);
      useEditorStore.getState().loadProject(data);
    } catch (err) {
      console.error('Failed to load project:', err);
      alert(`Failed to load project: ${err}`);
    }
  };

  const handleOpenFile = async () => {
    if (IS_ELECTRON) {
      const path = await window.electronAPI!.openFile();
      if (path) {
        loadVideo(path);
        await transcribeVideo(path);
      }
    } else {
      await handleBrowserOpenFile();
    }
  };

  const handleBrowserOpenFile = async () => {
    let fileHandle: FileSystemFileHandle;
    try {
      [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Video & Audio Files',
            accept: {
              'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
              'audio/*': ['.m4a'],
            },
          },
        ],
        multiple: false,
      });
    } catch {
      // User cancelled
      return;
    }

    const file = await fileHandle.getFile();
    const formData = new FormData();
    formData.append('file', file, file.name);

    const tempPath = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${backendUrl}/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText).file_path);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => {
        setUploadProgress(null);
        reject(new Error('Upload failed'));
      };
      xhr.send(formData);
    });

    loadVideo(tempPath);
    await transcribeVideo(tempPath);
  };

  const transcribeVideo = async (path: string) => {
    setTranscribing(true, 0);
    try {
      const res = await fetch(`${backendUrl}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: path, model: whisperModel }),
      });
      if (!res.ok) throw new Error(`Transcription failed: ${res.statusText}`);
      const data = await res.json();
      setTranscription(data);
    } catch (err) {
      console.error('Transcription error:', err);
      alert(`Transcription failed. Check the console for details.\n\n${err}`);
    } finally {
      setTranscribing(false);
    }
  };

  const togglePanel = (panel: Panel) =>
    setActivePanel((prev) => (prev === panel ? null : panel));

  if (!videoPath) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-8 bg-editor-bg px-6">
        <div className="flex flex-col items-center gap-3">
          <Film className="w-14 h-14 text-editor-accent opacity-80" />
          <h1 className="text-3xl font-semibold tracking-tight">CutScript</h1>
          <p className="text-editor-text-muted text-sm max-w-sm text-center">
            Open-source text-based video editing powered by AI.
          </p>
        </div>

        {/* Whisper model selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-editor-text-muted whitespace-nowrap">Whisper model:</label>
          <select
            value={whisperModel}
            onChange={(e) => setWhisperModel(e.target.value)}
            className="px-3 py-1.5 bg-editor-surface border border-editor-border rounded-lg text-xs text-editor-text focus:outline-none focus:border-editor-accent"
          >
            <option value="tiny">tiny (~75 MB, fastest)</option>
            <option value="base">base (~140 MB, fast)</option>
            <option value="small">small (~460 MB, good)</option>
            <option value="medium">medium (~1.5 GB, better)</option>
            <option value="large">large (~2.9 GB, best)</option>
          </select>
        </div>

        {IS_ELECTRON ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 px-6 py-3 bg-editor-accent hover:bg-editor-accent-hover rounded-lg text-white font-medium transition-colors"
            >
              <FolderOpen className="w-5 h-5" />
              Open Video File
            </button>
            <button
              onClick={handleLoadProject}
              className="flex items-center gap-2 px-4 py-2 text-sm text-editor-text-muted hover:text-editor-text hover:bg-editor-surface rounded-lg transition-colors"
            >
              <FileInput className="w-4 h-4" />
              Load Project (.aive)
            </button>
          </div>
        ) : (
          /* Browser: File System Access API picker */
          <div className="flex flex-col items-center gap-3">
            {uploadProgress !== null ? (
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-xs text-editor-text-muted">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-editor-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-editor-accent transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleBrowserOpenFile}
                  className="flex items-center gap-2 px-6 py-3 bg-editor-accent hover:bg-editor-accent-hover rounded-lg text-white font-medium transition-colors"
                >
                  <FolderOpen className="w-5 h-5" />
                  Open Video File
                </button>
                <p className="text-[11px] text-editor-text-muted text-center">
                  Supported: MP4, AVI, MOV, MKV, WebM, M4A
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-editor-border shrink-0">
        <div className="flex items-center gap-3">
          <Film className="w-5 h-5 text-editor-accent" />
          <span className="text-sm font-medium truncate max-w-[300px]">
            {videoPath.split(/[\\/]/).pop()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={<FolderOpen className="w-4 h-4" />}
            label="Open"
            onClick={IS_ELECTRON ? handleOpenFile : () => useEditorStore.getState().reset()}
          />
          <ToolbarButton
            icon={<Sparkles className="w-4 h-4" />}
            label="AI"
            active={activePanel === 'ai'}
            onClick={() => togglePanel('ai')}
            disabled={words.length === 0}
          />
          <ToolbarButton
            icon={<Download className="w-4 h-4" />}
            label="Export"
            active={activePanel === 'export'}
            onClick={() => togglePanel('export')}
            disabled={words.length === 0}
          />
          <ToolbarButton
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
            active={activePanel === 'settings'}
            onClick={() => togglePanel('settings')}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: video + transcript */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Video player */}
            <div className="w-1/2 p-3 flex items-center justify-center bg-black/20">
              <VideoPlayer />
            </div>

            {/* Transcript */}
            <div className="w-1/2 border-l border-editor-border flex flex-col min-h-0">
              {isTranscribing ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-editor-accent animate-spin" />
                  <p className="text-sm text-editor-text-muted">
                    Transcribing... {Math.round(transcriptionProgress)}%
                  </p>
                </div>
              ) : words.length > 0 ? (
                <TranscriptEditor />
              ) : (
                <div className="flex-1 flex items-center justify-center text-editor-text-muted text-sm">
                  No transcript yet
                </div>
              )}
            </div>
          </div>

          {/* Waveform timeline */}
          <div className="h-32 border-t border-editor-border shrink-0">
            <WaveformTimeline />
          </div>
        </div>

        {/* Right panel (AI / Export / Settings) */}
        {activePanel && (
          <div className="w-80 border-l border-editor-border overflow-y-auto shrink-0">
            {activePanel === 'ai' && <AIPanel />}
            {activePanel === 'export' && <ExportDialog />}
            {activePanel === 'settings' && <SettingsPanel />}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-editor-accent text-white'
          : 'text-editor-text-muted hover:text-editor-text hover:bg-editor-surface'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}
