import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cloud,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  List,
  Loader2,
  LogOut,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  clearDriveToken,
  findOrCreateIqraFolder,
  getCachedDriveToken,
  getDriveEmbedUrl,
  getGoogleClientId,
  isEditableGoogleFile,
  listDriveFiles,
  renameDriveFile,
  requestDriveToken,
  saveGoogleClientId,
  trashDriveFile,
  uploadToDrive,
  type DriveFileItem,
} from '../lib/googleDrive';

type FilterKind = 'All' | 'Doc' | 'Sheet' | 'PDF' | 'Image';

function classifyDriveFile(file: DriveFileItem): Exclude<FilterKind, 'All'> {
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
  const [driveLoading, setDriveLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [convertEditable, setConvertEditable] = useState(true);

  // Multi-tab viewer/editor workspace (open multiple PDFs, Docs, Sheets at once!)
  const [openTabs, setOpenTabs] = useState<DriveFileItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabsMinimized, setTabsMinimized] = useState(false);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [kindFilter, setKindFilter] = useState<FilterKind>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(() => new Set());

  // Multi-select (hover-to-select) & delete confirmation state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDeleteFiles, setConfirmDeleteFiles] = useState<DriveFileItem[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [matrixPinnedMsg, setMatrixPinnedMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDriveFolder = useCallback(async (token: string) => {
    setDriveLoading(true);
    setDriveError(null);
    try {
      const folderId = await findOrCreateIqraFolder(token);
      setDriveFolderId(folderId);
      const files = await listDriveFiles(token, folderId);
      setDriveFiles(files.filter((f) => !f.name.endsWith('.iqra.json')));
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
    setOpenTabs([]);
    setActiveTabId(null);
  };

  // Direct 1-click bulk upload (no questions!)
  const handleDriveUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !driveToken || !driveFolderId) return;
    const list = Array.from(files);
    setUploadProgress({ done: 0, total: list.length });
    setDriveError(null);
    try {
      let done = 0;
      for (const f of list) {
        await uploadToDrive(driveToken, driveFolderId, f, convertEditable);
        done++;
        setUploadProgress({ done, total: list.length });
      }
      await loadDriveFolder(driveToken);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectFile = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const executeConfirmedDelete = async () => {
    if (!driveToken || !confirmDeleteFiles || confirmDeleteFiles.length === 0) return;
    setIsDeleting(true);
    setDriveError(null);
    const idsToRemove = new Set(confirmDeleteFiles.map((f) => f.id));
    try {
      for (const f of confirmDeleteFiles) {
        await trashDriveFile(driveToken, f.id);
      }
      setDriveFiles((prev) => prev.filter((f) => !idsToRemove.has(f.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToRemove.forEach((id) => next.delete(id));
        return next;
      });
      setOpenTabs((prev) => {
        const next = prev.filter((t) => !idsToRemove.has(t.id));
        if (activeTabId && idsToRemove.has(activeTabId)) {
          setActiveTabId(next[next.length - 1]?.id ?? null);
        }
        return next;
      });
      setConfirmDeleteFiles(null);
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Could not delete file(s).');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkOpenTabs = () => {
    const chosen = driveFiles.filter((f) => selectedIds.has(f.id));
    if (chosen.length === 0) return;
    setOpenTabs((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      const additions = chosen.filter((f) => !existing.has(f.id));
      return [...prev, ...additions];
    });
    setActiveTabId(chosen[0].id);
    setTabsMinimized(false);
    setSelectedIds(new Set());
  };

  const handleBulkImportToMatrix = () => {
    const chosen = driveFiles.filter((f) => selectedIds.has(f.id));
    if (chosen.length === 0) return;
    const key = 'iqra_matrix_drive_pins_iqra_study_matrix';
    try {
      const raw = localStorage.getItem(key);
      const existing = raw ? (JSON.parse(raw) as unknown[]) : [];
      const newPins = chosen.map((file, idx) => ({
        id: `dpin_${Date.now().toString(36)}_${idx}`,
        file,
        x: 160 + idx * 36,
        y: 120 + idx * 36,
        w: 420,
        h: 360,
      }));
      localStorage.setItem(key, JSON.stringify([...existing, ...newPins]));
      setMatrixPinnedMsg(
        `Pinned ${chosen.length} file${chosen.length === 1 ? '' : 's'} to Study Matrix!`
      );
      window.setTimeout(() => setMatrixPinnedMsg(null), 3500);
      setSelectedIds(new Set());
    } catch {
      setDriveError('Could not import files to Study Matrix.');
    }
  };

  const handleRenameSubmit = async (fileId: string) => {
    if (!driveToken) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await renameDriveFile(driveToken, fileId, trimmed);
      setDriveFiles((prev) => prev.map((f) => (f.id === fileId ? updated : f)));
      setOpenTabs((prev) => prev.map((t) => (t.id === fileId ? updated : t)));
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Could not rename file.');
    } finally {
      setRenamingId(null);
    }
  };

  const openFileAsTab = (file: DriveFileItem) => {
    setOpenTabs((prev) => (prev.some((t) => t.id === file.id) ? prev : [...prev, file]));
    setActiveTabId(file.id);
    setTabsMinimized(false);
  };

  const closeTab = (fileId: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== fileId);
      if (activeTabId === fileId) {
        setActiveTabId(next[next.length - 1]?.id ?? null);
      }
      return next;
    });
  };

  const filteredFiles = useMemo(() => {
    return driveFiles.filter((file) => {
      const category = classifyDriveFile(file);
      if (kindFilter !== 'All' && category !== kindFilter) return false;
      if (search.trim()) {
        return file.name.toLowerCase().includes(search.trim().toLowerCase());
      }
      return true;
    });
  }, [driveFiles, kindFilter, search]);

  const activeTabFile = openTabs.find((t) => t.id === activeTabId) ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <Library className="w-5 h-5 text-[#5B3A70]" />
            My Files
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Upload PDFs, images, Word &amp; Excel in bulk — open multiple files as tabs inside Iqra Desk
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => void handleDriveUpload(e.target.files)}
            className="hidden"
          />

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
            disabled={!!uploadProgress}
            onClick={() => {
              if (!driveToken) {
                void handleConnectDrive();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#5B3A70] hover:bg-[#6D4785] text-white rounded-xl shadow-xs whitespace-nowrap disabled:opacity-60"
          >
            {uploadProgress ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {uploadProgress
              ? `Uploading ${uploadProgress.done}/${uploadProgress.total}...`
              : 'Add Resource'}
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

      {/* Filters + Auto-convert toggle */}
      {driveToken && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'PDF', 'Doc', 'Sheet', 'Image'] as const).map((k) => (
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

            <label className="ml-2 inline-flex items-center gap-1.5 text-[11px] text-[#6E6E73] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={convertEditable}
                onChange={(e) => setConvertEditable(e.target.checked)}
                className="rounded accent-[#5B3A70]"
              />
              Auto-convert Word/Excel to Docs/Sheets
            </label>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Drive files..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/70 border border-[#E2E0D8] rounded-xl"
              />
            </div>

            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-black/5 border border-[#E2E0D8] shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View with Previews"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#5B3A70] text-white shadow-2xs'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#5B3A70] text-white shadow-2xs'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {matrixPinnedMsg && (
        <div className="text-xs font-semibold text-emerald-700 bg-emerald-500/12 border border-emerald-500/25 rounded-xl px-3.5 py-2.5">
          {matrixPinnedMsg}
        </div>
      )}

      {/* Bulk Selection Action Bar (appears automatically when hovering & selecting files) */}
      {driveToken && selectedIds.size > 0 && (
        <div className="paper-card rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border border-[#0A5386]/30 bg-[#0A5386]/[0.04] animate-workspace-enter">
          <div className="flex items-center gap-3 text-xs font-semibold text-[#1C1C1E]">
            <span>{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => {
                const allSelected =
                  filteredFiles.length > 0 && filteredFiles.every((f) => selectedIds.has(f.id));
                if (allSelected) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
                }
              }}
              className="text-[#0A5386] hover:underline"
            >
              {filteredFiles.length > 0 && filteredFiles.every((f) => selectedIds.has(f.id))
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkOpenTabs}
              className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B3A70] hover:bg-[#6D4785] text-white text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5" />
              Open Tabs ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={handleBulkImportToMatrix}
              className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A5386] hover:bg-[#08446E] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Import to Matrix
            </button>
            <button
              type="button"
              onClick={() =>
                setConfirmDeleteFiles(driveFiles.filter((f) => selectedIds.has(f.id)))
              }
              className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              title="Clear selection"
              className="p-1.5 rounded-xl text-[#6E6E73] hover:text-[#1C1C1E] hover:bg-black/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Unified Drive Files Grid */}
      {!driveToken ? (
        <div className="paper-card rounded-2xl p-10 text-center space-y-3">
          <Cloud className="w-8 h-8 text-[#0A5386] mx-auto" />
          <div className="text-sm font-bold text-[#1C1C1E]">
            Connect your Google Drive to access your Resource Library
          </div>
          <p className="text-xs text-[#8E8E93] max-w-md mx-auto">
            Click <strong>Add Resource</strong> to bulk-upload PDFs, images, Word &amp; Excel files directly to your &ldquo;Iqra Desk&rdquo; folder.
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
          Loading files from your &ldquo;Iqra Desk&rdquo; Google Drive...
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="paper-card rounded-2xl p-10 text-center text-xs text-[#8E8E93]">
          No files here yet. Click <strong>+ Add Resource</strong> to upload one or multiple files at once!
        </div>
      ) : viewMode === 'list' ? (
        <div className="paper-card rounded-2xl divide-y divide-[#E2E0D8]/60 overflow-hidden">
          {filteredFiles.map((file) => {
            const isSheet =
              file.mimeType.includes('spreadsheet') || file.mimeType.includes('csv');
            const isImg = file.mimeType.startsWith('image/');
            const editable = isEditableGoogleFile(file.mimeType);
            const isRenaming = renamingId === file.id;
            const sizeKb = file.size ? Math.max(1, Math.round(Number(file.size) / 1024)) : null;

            return (
              <div
                key={file.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-black/[0.02] group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleSelectFile(file.id)}
                    title={selectedIds.has(file.id) ? 'Deselect' : 'Select'}
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-opacity ${
                      selectedIds.has(file.id)
                        ? 'opacity-100 bg-[#0A5386] border-[#0A5386] text-white'
                        : selectedIds.size > 0
                        ? 'opacity-100 border-[#A1A1AA] bg-white'
                        : 'opacity-0 group-hover:opacity-100 border-[#A1A1AA] bg-white'
                    }`}
                  >
                    {selectedIds.has(file.id) && <Check className="w-3 h-3" />}
                  </button>
                  {isSheet ? (
                    <FileSpreadsheet className="w-4 h-4 text-[#1B5E5A] shrink-0" />
                  ) : isImg ? (
                    <ImageIcon className="w-4 h-4 text-[#9B5B76] shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#0A5386] shrink-0" />
                  )}

                  {isRenaming ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleRenameSubmit(file.id);
                      }}
                      className="flex items-center gap-1.5 flex-1 min-w-0"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded-lg border border-[#0A5386] bg-white focus:outline-none"
                      />
                      <button type="submit" className="p-1 rounded-lg bg-[#0A5386] text-white">
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="p-1 rounded-lg bg-black/5 text-[#52525B]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFileAsTab(file)}
                      className="text-xs font-bold text-[#1C1C1E] truncate hover:underline text-left"
                    >
                      {file.name}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                  <span className="hidden sm:inline text-[#8E8E93]">
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
                  <button
                    type="button"
                    onClick={() => openFileAsTab(file)}
                    className="text-[#0A5386] font-bold hover:underline"
                  >
                    {editable ? 'Open & Edit' : 'Open Tab'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(file.id);
                      setRenameValue(file.name);
                    }}
                    title="Rename file"
                    className="p-1 rounded-md text-[#8E8E93] hover:text-[#0A5386]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in Google Drive"
                      className="text-[#6E6E73] hover:text-[#1C1C1E]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteFiles([file])}
                    title="Move to Drive Trash"
                    className="p-1 rounded-md text-[#8E8E93] hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const isSheet =
              file.mimeType.includes('spreadsheet') || file.mimeType.includes('csv');
            const isImg = file.mimeType.startsWith('image/');
            const editable = isEditableGoogleFile(file.mimeType);
            const isRenaming = renamingId === file.id;
            const sizeKb = file.size ? Math.max(1, Math.round(Number(file.size) / 1024)) : null;
            const thumbSrc =
              !brokenThumbs.has(file.id)
                ? file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w600`
                : null;

            return (
              <div
                key={file.id}
                className="paper-card rounded-2xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Visual Preview Thumbnail with Hover-to-Select Checkbox */}
                <div className="relative w-full h-36 bg-black/[0.04] border-b border-[#E2E0D8]/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectFile(file.id);
                    }}
                    title={selectedIds.has(file.id) ? 'Deselect' : 'Select'}
                    className={`absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-md flex items-center justify-center border shadow-sm transition-opacity ${
                      selectedIds.has(file.id)
                        ? 'opacity-100 bg-[#0A5386] border-[#0A5386] text-white'
                        : selectedIds.size > 0
                        ? 'opacity-100 bg-white/95 border-[#A1A1AA]'
                        : 'opacity-0 group-hover:opacity-100 bg-white/95 border-[#A1A1AA]'
                    }`}
                  >
                    {selectedIds.has(file.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openFileAsTab(file)}
                    className="w-full h-full flex items-center justify-center"
                  >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenThumbs((prev) => new Set(prev).add(file.id))
                      }
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                    />
                  ) : isSheet ? (
                    <FileSpreadsheet className="w-10 h-10 text-[#1B5E5A]/60" />
                  ) : isImg ? (
                    <ImageIcon className="w-10 h-10 text-[#9B5B76]/60" />
                  ) : (
                    <FileText className="w-10 h-10 text-[#0A5386]/60" />
                  )}
                  </button>
                </div>

                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    {isRenaming ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRenameSubmit(file.id);
                        }}
                        className="flex items-center gap-1.5 flex-1 min-w-0"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded-lg border border-[#0A5386] bg-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          title="Save name"
                          className="p-1 rounded-lg bg-[#0A5386] text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          title="Cancel"
                          className="p-1 rounded-lg bg-black/5 text-[#52525B]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openFileAsTab(file)}
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
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(file.id);
                              setRenameValue(file.name);
                            }}
                            title="Rename file"
                            className="p-1 rounded-md text-[#8E8E93] hover:text-[#0A5386]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFiles([file])}
                            title="Move to Drive Trash"
                            className="p-1 rounded-md text-[#8E8E93] hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
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
                        onClick={() => openFileAsTab(file)}
                        className="text-[#0A5386] font-bold hover:underline"
                      >
                        {editable ? 'Open & Edit' : 'Open Tab'}
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
              </div>
            );
          })}
        </div>
      )}

      {/* Minimized Multi-Tab Dock Pill */}
      {openTabs.length > 0 && tabsMinimized && (
        <button
          type="button"
          onClick={() => setTabsMinimized(false)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 ios-press px-4 py-2 rounded-full bg-[#1C1C1E] text-white text-xs font-semibold shadow-2xl flex items-center gap-2"
        >
          <FileText className="w-3.5 h-3.5 text-[#0A84FF]" />
          <span>
            {openTabs.length} {openTabs.length === 1 ? 'File' : 'Files'} Open — Click to Resume
          </span>
        </button>
      )}

      {/* Multi-Tab In-App Viewer & Live Editor Modal */}
      {openTabs.length > 0 && !tabsMinimized && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5">
          <div
            style={{ backgroundColor: '#ffffff', color: '#18181b' }}
            className="w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-300"
          >
            {/* Browser-style Tabs Bar */}
            <div
              style={{ backgroundColor: '#f4f2ed', borderColor: '#e2e0d8' }}
              className="px-3 pt-2.5 pb-0 border-b flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
                {openTabs.map((tab) => {
                  const active = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      style={
                        active
                          ? { backgroundColor: '#ffffff', color: '#18181b', borderColor: '#e2e0d8' }
                          : { color: '#52525b' }
                      }
                      className={`group flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-semibold max-w-[200px] shrink-0 cursor-pointer transition-colors ${
                        active ? 'border-t border-x' : 'hover:bg-black/5'
                      }`}
                      onClick={() => setActiveTabId(tab.id)}
                    >
                      <span className="truncate">{tab.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        title="Close tab"
                        style={{ color: '#52525b' }}
                        className="p-0.5 rounded-md hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 pb-2 shrink-0">
                {activeTabFile?.webViewLink && (
                  <a
                    href={activeTabFile.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in New Browser Tab"
                    style={{ backgroundColor: '#ffffff', color: '#18181b', borderColor: '#d4d4d8' }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold hover:opacity-90"
                  >
                    New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setTabsMinimized(true)}
                  title="Minimize tabs"
                  style={{ backgroundColor: '#e4e4e7', color: '#18181b' }}
                  className="p-1.5 rounded-lg hover:opacity-80"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenTabs([]);
                    setActiveTabId(null);
                  }}
                  title="Close all tabs"
                  style={{ backgroundColor: '#e4e4e7', color: '#18181b' }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Keep all open tab iframes mounted so switching PDFs/Docs is instant */}
            <div className="relative flex-1 bg-white">
              {openTabs.map((tab) => (
                <iframe
                  key={tab.id}
                  src={getDriveEmbedUrl(tab)}
                  title={tab.name}
                  className={`w-full h-full border-0 bg-white ${
                    tab.id === activeTabId ? 'block' : 'hidden'
                  }`}
                  allow="autoplay; clipboard-write; clipboard-read"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteFiles && confirmDeleteFiles.length > 0 && (
        <div
          onClick={() => !isDeleting && setConfirmDeleteFiles(null)}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="paper-card w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[#E2E0D8] space-y-4 animate-workspace-enter"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#1C1C1E]">
                  {confirmDeleteFiles.length === 1
                    ? 'Delete this file?'
                    : `Delete ${confirmDeleteFiles.length} selected files?`}
                </h3>
                <p className="text-xs text-[#8E8E93] mt-1">
                  They will be moved to your Google Drive Trash.
                </p>
              </div>
            </div>

            <div className="max-h-28 overflow-y-auto rounded-xl bg-black/5 p-2.5 space-y-1 text-xs text-[#1C1C1E]">
              {confirmDeleteFiles.slice(0, 4).map((f) => (
                <div key={f.id} className="truncate font-medium">
                  • {f.name}
                </div>
              ))}
              {confirmDeleteFiles.length > 4 && (
                <div className="text-[11px] text-[#8E8E93]">
                  ...and {confirmDeleteFiles.length - 4} more
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteFiles(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E2E0D8] text-xs font-semibold text-[#52525B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void executeConfirmedDelete()}
                className="ios-press inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Move to Trash'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
