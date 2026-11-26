import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Cloud,
  Code2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Library,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  clearDriveToken,
  fetchDriveFileJson,
  findOrCreateIqraFolder,
  getCachedDriveToken,
  getDriveEmbedUrl,
  getGoogleClientId,
  isEditableGoogleFile,
  listDriveFiles,
  requestDriveToken,
  saveGoogleClientId,
  trashDriveFile,
  uploadJsonResourceToDrive,
  uploadToDrive,
  type DriveFileItem,
  type DriveSavedNoteResource,
} from '../lib/googleDrive';

type FilterKind = 'All' | 'Doc' | 'Sheet' | 'PDF' | 'Image' | 'Link';

function classifyDriveFile(
  file: DriveFileItem,
  meta?: DriveSavedNoteResource
): Exclude<FilterKind, 'All'> {
  if (meta) return 'Link';
  if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('csv')) return 'Sheet';
  if (
    file.mimeType === 'application/vnd.google-apps.document' ||
    file.mimeType.includes('wordprocessingml') ||
    file.mimeType === 'application/msword'
  ) {
    return 'Doc';
  }
  if (file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return 'PDF';
  }
  if (file.mimeType.startsWith('image/')) return 'Image';
  return 'Doc';
}

export const ResourcesView: React.FC = () => {
  const [clientIdInput, setClientIdInput] = useState(() => getGoogleClientId());
  const [driveToken, setDriveToken] = useState<string | null>(() => getCachedDriveToken());
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [jsonMetaMap, setJsonMetaMap] = useState<Record<string, DriveSavedNoteResource>>({});
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveUploading, setDriveUploading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [convertEditable, setConvertEditable] = useState(true);
  const [activeDriveFile, setActiveDriveFile] = useState<DriveFileItem | null>(null);

  const [kindFilter, setKindFilter] = useState<FilterKind>('All');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [noteKind, setNoteKind] = useState<'Bookmark' | 'Video' | 'Snippet'>('Bookmark');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDriveFolder = useCallback(async (token: string) => {
    setDriveLoading(true);
    setDriveError(null);
    try {
      const folderId = await findOrCreateIqraFolder(token);
      setDriveFolderId(folderId);
      const files = await listDriveFiles(token, folderId);
      setDriveFiles(files);

      // Load metadata for any .iqra.json link/snippet resources
      const jsonFiles = files.filter((f) => f.name.endsWith('.iqra.json'));
      if (jsonFiles.length > 0) {
        const entries = await Promise.all(
          jsonFiles.map(async (jf) => {
            try {
              const data = await fetchDriveFileJson<DriveSavedNoteResource>(token, jf.id);
              return [jf.id, data] as const;
            } catch {
              return null;
            }
          })
        );
        const map: Record<string, DriveSavedNoteResource> = {};
        for (const item of entries) {
          if (item) map[item[0]] = item[1];
        }
        setJsonMetaMap(map);
      } else {
        setJsonMetaMap({});
      }
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Failed to load Google Drive.');
      if (err instanceof Error && err.message.includes('401')) {
        setDriveToken(null);
      }
    } finally {
      setDriveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (driveToken) {
      void loadDriveFolder(driveToken);
    }
  }, [driveToken, loadDriveFolder]);

  const handleConnectDrive = async () => {
    const cid = clientIdInput.trim() || getGoogleClientId();
    if (!cid) {
      setDriveError('Please paste your Google OAuth Client ID below first.');
      return;
    }
    saveGoogleClientId(cid);
    setDriveError(null);
    try {
      const token = await requestDriveToken(cid);
      setDriveToken(token);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Could not connect Google Drive.');
    }
  };

  const handleDisconnectDrive = () => {
    clearDriveToken();
    setDriveToken(null);
    setDriveFolderId(null);
    setDriveFiles([]);
    setJsonMetaMap({});
  };

  const handleDriveUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !driveToken || !driveFolderId) return;
    setDriveUploading(true);
    setDriveError(null);
    try {
      for (const f of Array.from(files)) {
        await uploadToDrive(driveToken, driveFolderId, f, convertEditable);
      }
      await loadDriveFolder(driveToken);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setDriveUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLinkResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !driveToken || !driveFolderId) return;
    setDriveUploading(true);
    setDriveError(null);
    try {
      await uploadJsonResourceToDrive(driveToken, driveFolderId, {
        kind: noteKind,
        title: title.trim(),
        url: url.trim() || undefined,
        content: content.trim() || undefined,
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setTitle('');
      setUrl('');
      setContent('');
      setTagsRaw('');
      setShowAddForm(false);
      await loadDriveFolder(driveToken);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Failed to save resource to Drive.');
    } finally {
      setDriveUploading(false);
    }
  };

  const handleTrashDriveFile = async (fileId: string) => {
    if (!driveToken) return;
    try {
      await trashDriveFile(driveToken, fileId);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Could not delete file.');
    }
  };

  const filteredFiles = useMemo(() => {
    return driveFiles.filter((file) => {
      const meta = jsonMetaMap[file.id];
      const category = classifyDriveFile(file, meta);
      if (kindFilter !== 'All' && category !== kindFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = (meta?.title || file.name).toLowerCase().includes(q);
        const contentMatch = meta?.content?.toLowerCase().includes(q) ?? false;
        const tagMatch = meta?.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        return nameMatch || contentMatch || tagMatch;
      }
      return true;
    });
  }, [driveFiles, jsonMetaMap, kindFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <Library className="w-5 h-5 text-[#5B3A70]" />
            Resource Library
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            All PDFs, images, Docs, Sheets &amp; links saved directly in your &ldquo;Iqra Desk&rdquo; Google Drive
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!driveToken ? (
            <button
              type="button"
              onClick={() => void handleConnectDrive()}
              className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#08446E] text-white rounded-xl shadow-xs whitespace-nowrap"
            >
              <Cloud className="w-3.5 h-3.5" />
              Connect Drive
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600/12 text-emerald-700 text-xs font-semibold whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Drive Connected</span>
              <button
                type="button"
                onClick={() => driveToken && void loadDriveFolder(driveToken)}
                title="Refresh Drive"
                className="p-0.5 rounded-md hover:bg-emerald-700/15 text-emerald-700"
              >
                <RefreshCw className={`w-3 h-3 ${driveLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleDisconnectDrive}
                title="Disconnect Drive"
                className="p-0.5 rounded-md hover:bg-red-500/15 text-emerald-700 hover:text-red-600"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (!driveToken) {
                void handleConnectDrive();
              } else {
                setShowAddForm((v) => !v);
              }
            }}
            className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#5B3A70] hover:bg-[#6D4785] text-white rounded-xl shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Client ID Input if env not configured */}
      {!driveToken && !getGoogleClientId() && (
        <div className="paper-card rounded-2xl p-4 flex flex-col sm:flex-row gap-2 border border-[#E2E0D8]">
          <input
            type="text"
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            placeholder="Paste Google OAuth Client ID (or set VITE_GOOGLE_CLIENT_ID)"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/70 focus:outline-none focus:border-[#0A5386]"
          />
          <button
            type="button"
            onClick={() => void handleConnectDrive()}
            className="ios-press px-4 py-2 rounded-xl bg-[#0A5386] text-white text-xs font-semibold"
          >
            Connect Drive
          </button>
        </div>
      )}

      {driveError && (
        <div className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
          {driveError}
        </div>
      )}

      {/* Unified Add Resource Panel (Upload Files OR Save Link/Snippet to Drive) */}
      {showAddForm && driveToken && (
        <form
          onSubmit={(e) => void handleAddLinkResource(e)}
          className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-sm font-bold text-[#1C1C1E]">Add Resource to Google Drive</div>
            <label className="inline-flex items-center gap-2 text-[11px] text-[#52525B] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={convertEditable}
                onChange={(e) => setConvertEditable(e.target.checked)}
                className="rounded accent-[#0A5386]"
              />
              Auto-convert uploaded Word/Excel to editable Docs/Sheets
            </label>
          </div>

          {/* File Upload Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              void handleDriveUpload(e.target.files).then(() => setShowAddForm(false));
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={driveUploading || !driveFolderId}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-[#0A5386]/35 bg-[#0A5386]/[0.03] hover:bg-[#0A5386]/[0.07] transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-[#0A5386] disabled:opacity-60"
          >
            {driveUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {driveUploading
              ? 'Uploading to Iqra Desk Drive...'
              : 'Click to Upload PDF, Image, Word (.docx), or Excel (.xlsx)'}
          </button>

          <div className="flex items-center gap-3 text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider">
            <span className="flex-1 h-px bg-[#E2E0D8]" />
            <span>or save a link / snippet</span>
            <span className="flex-1 h-px bg-[#E2E0D8]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={noteKind}
              onChange={(e) => setNoteKind(e.target.value as 'Bookmark' | 'Video' | 'Snippet')}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            >
              <option value="Bookmark">Bookmark / Link</option>
              <option value="Video">Lecture Video</option>
              <option value="Snippet">Code / Formula Snippet</option>
            </select>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            />
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            />
          </div>

          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (website, YouTube lecture, etc.)"
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
          />

          <textarea
            rows={noteKind === 'Snippet' ? 4 : 2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              noteKind === 'Snippet'
                ? 'Paste code snippet or formula...'
                : 'Short summary or notes...'
            }
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 font-mono"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#6E6E73]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={driveUploading}
              className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#5B3A70] text-white rounded-xl disabled:opacity-60"
            >
              {driveUploading ? 'Saving to Drive...' : 'Save to Drive'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      {driveToken && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'Doc', 'Sheet', 'PDF', 'Image', 'Link'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                  kindFilter === k
                    ? 'bg-[#5B3A70] text-white border-[#5B3A70]'
                    : 'paper-card text-[#52525B] border-[#E2E0D8]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Drive resources..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/70 border border-[#E2E0D8] rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Unified Drive Resources Grid */}
      {!driveToken ? (
        <div className="paper-card rounded-2xl p-10 text-center space-y-3">
          <Cloud className="w-8 h-8 text-[#0A5386] mx-auto" />
          <div className="text-sm font-bold text-[#1C1C1E]">
            Connect your Google Drive to access your Resource Library
          </div>
          <p className="text-xs text-[#8E8E93] max-w-md mx-auto">
            Everything you upload or save here is stored directly in your &ldquo;Iqra Desk&rdquo; Google Drive folder.
          </p>
          <button
            type="button"
            onClick={() => void handleConnectDrive()}
            className="ios-press inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A5386] hover:bg-[#08446E] text-white text-xs font-semibold shadow-xs"
          >
            <Cloud className="w-4 h-4" />
            Connect Google Drive
          </button>
        </div>
      ) : driveLoading && driveFiles.length === 0 ? (
        <div className="paper-card rounded-2xl p-10 text-center text-xs text-[#8E8E93] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading resources from your &ldquo;Iqra Desk&rdquo; Google Drive...
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="paper-card rounded-2xl p-10 text-center text-xs text-[#8E8E93]">
          Your &ldquo;Iqra Desk&rdquo; folder has no matching resources yet. Upload PDFs, images, Word/Excel files, or click <strong>Add Resource</strong>!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const meta = jsonMetaMap[file.id];
            if (meta) {
              return (
                <div
                  key={file.id}
                  className="paper-card rounded-2xl p-4 space-y-2.5 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {meta.kind === 'Video' ? (
                          <Video className="w-4 h-4 text-[#0A5386] shrink-0" />
                        ) : meta.kind === 'Snippet' ? (
                          <Code2 className="w-4 h-4 text-[#1B5E5A] shrink-0" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-[#5B3A70] shrink-0" />
                        )}
                        <span className="text-xs font-bold text-[#1C1C1E] truncate">
                          {meta.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleTrashDriveFile(file.id)}
                        title="Move to Drive Trash"
                        className="text-[#8E8E93] opacity-0 group-hover:opacity-100 hover:text-red-600 shrink-0 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {meta.content && (
                      <pre
                        className={`text-[11px] whitespace-pre-wrap break-words rounded-xl p-2.5 bg-black/5 ${
                          meta.kind === 'Snippet' ? 'font-mono text-[#1C1C1E]' : 'text-[#52525B]'
                        }`}
                      >
                        {meta.content}
                      </pre>
                    )}

                    {meta.tags && meta.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {meta.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-[#52525B]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E0D8]/60 text-[11px]">
                    <span className="text-[#8E8E93]">{meta.kind} · Drive</span>
                    {meta.url && (
                      <a
                        href={meta.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0A5386] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            }

            const isSheet =
              file.mimeType.includes('spreadsheet') || file.mimeType.includes('csv');
            const isImg = file.mimeType.startsWith('image/');
            const editable = isEditableGoogleFile(file.mimeType);
            const sizeKb = file.size ? Math.max(1, Math.round(Number(file.size) / 1024)) : null;

            return (
              <div
                key={file.id}
                className="paper-card rounded-2xl p-4 space-y-2.5 flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveDriveFile(file)}
                    className="flex items-center gap-2 min-w-0 text-left flex-1"
                  >
                    {isSheet ? (
                      <FileSpreadsheet className="w-4 h-4 text-[#1B5E5A] shrink-0" />
                    ) : isImg ? (
                      <ImageIcon className="w-4 h-4 text-[#9B5B76] shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-[#0A5386] shrink-0" />
                    )}
                    <span className="text-xs font-bold text-[#1C1C1E] truncate hover:underline">
                      {file.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTrashDriveFile(file.id)}
                    title="Move to Drive Trash"
                    className="text-[#8E8E93] opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E2E0D8]/60 text-[11px]">
                  <span className="text-[#8E8E93]">
                    {editable
                      ? isSheet
                        ? 'Google Sheet'
                        : 'Google Doc'
                      : sizeKb
                      ? sizeKb > 1024
                        ? `${(sizeKb / 1024).toFixed(1)} MB`
                        : `${sizeKb} KB`
                      : 'Drive File'}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveDriveFile(file)}
                      className="text-[#0A5386] font-bold hover:underline"
                    >
                      {editable ? 'Open & Edit' : 'View'}
                    </button>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Google Drive"
                        className="text-[#6E6E73] hover:text-[#1C1C1E]"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Drive Viewer & Live Docs/Sheets Editor Modal */}
      {activeDriveFile && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#E2E0D8]">
            <div className="px-4 py-3 border-b border-[#E2E0D8] flex items-center justify-between gap-3 bg-[#FAF9F6]">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1C1C1E] truncate">
                  {activeDriveFile.name}
                </div>
                <div className="text-[11px] text-[#8E8E93]">
                  {isEditableGoogleFile(activeDriveFile.mimeType)
                    ? 'Live editing inside Iqra Desk — changes auto-save to Google Drive'
                    : 'Previewing from Google Drive'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeDriveFile.webViewLink && (
                  <a
                    href={activeDriveFile.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E2E0D8] bg-white text-xs font-semibold text-[#1C1C1E] hover:bg-black/5"
                  >
                    New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDriveFile(null)}
                  className="p-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-[#1C1C1E]"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={getDriveEmbedUrl(activeDriveFile)}
              title={activeDriveFile.name}
              className="w-full flex-1 border-0 bg-white"
              allow="autoplay; clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  );
};
