import React, { useEffect, useRef, useState } from 'react';
import {
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ColorRingPicker } from './ColorRingPicker';
import { GlassFolderIcon } from './GlassFolderIcon';

export interface StudyFolder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export const FOLDERS_STORAGE_KEY = 'iqra_study_folders_v1';

const FOLDER_COLORS = [
  '#254454',
  '#0A5386',
  '#9B5B76',
  '#1B5E5A',
  '#5B3A70',
  '#A43850',
  '#D97706',
  '#133F47',
];

export const DEFAULT_STUDY_FOLDERS: StudyFolder[] = [
  {
    id: 'iqra_study_matrix',
    name: 'General Study Matrix',
    color: '#254454',
    createdAt: 1700000000000,
  },
];

export function loadStudyFolders(): StudyFolder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudyFolder[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_STUDY_FOLDERS;
}

interface StudyFoldersViewProps {
  onOpenFolder: (folder: StudyFolder) => void;
}

export const StudyFoldersView: React.FC<StudyFoldersViewProps> = ({ onOpenFolder }) => {
  const [folders, setFolders] = useState<StudyFolder[]>(() => loadStudyFolders());

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [openingState, setOpeningState] = useState<{
    folder: StudyFolder;
    fromRect: { left: number; top: number; width: number; height: number };
    stage: 'start' | 'center' | 'open' | 'zoom';
  } | null>(null);
  const openTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      openTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const triggerOpenFolder = (folder: StudyFolder, el: HTMLElement) => {
    if (openingState) return;
    openTimersRef.current.forEach((id) => window.clearTimeout(id));

    const r = el.getBoundingClientRect();
    setOpeningState({
      folder,
      fromRect: { left: r.left, top: r.top, width: r.width, height: r.height },
      stage: 'start',
    });

    // Double rAF guarantees the browser paints exact shelf position before gliding to center (matching Notebook)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setOpeningState((prev) => (prev ? { ...prev, stage: 'center' } : null));
      });
    });

    const t1 = window.setTimeout(() => {
      setOpeningState((prev) => (prev ? { ...prev, stage: 'open' } : null));
    }, 280);

    const t2 = window.setTimeout(() => {
      setOpeningState((prev) => (prev ? { ...prev, stage: 'zoom' } : null));
    }, 580);

    const t3 = window.setTimeout(() => {
      setOpeningState(null);
      onOpenFolder(folder);
    }, 860);

    openTimersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch {
      // ignore
    }
  }, [folders]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const folder: StudyFolder = {
      id: `folder_${Date.now().toString(36)}`,
      name: trimmed,
      color: newColor,
      createdAt: Date.now(),
    };
    setFolders((prev) => [folder, ...prev]);
    setNewName('');
    setShowCreate(false);
  };

  const handleRename = (id: string) => {
    const trimmed = renameVal.trim();
    if (trimmed) {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f))
      );
    }
    setRenamingId(null);
  };

  const handleDeleteFolder = (id: string) => {
    if (folders.length <= 1) return;
    setFolders((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2.5">
            <GlassFolderIcon color="#254454" size={28} />
            Folder Shelf
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Create color-coded folders — open any folder to use its infinite Study Matrix
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#254454] hover:bg-[#1C3542] text-white rounded-xl shadow-xs shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Folder
        </button>
      </div>

      {/* Create Folder Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateFolder}
          className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8] animate-workspace-enter"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#1C1C1E]">Create Study Folder</div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="p-1 rounded-lg text-[#8E8E93] hover:text-[#1C1C1E]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <GlassFolderIcon color={newColor} size={56} />
            <input
              type="text"
              required
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name (e.g. Robotics, Calculus, Exam Prep)"
              className="flex-1 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E0D8] bg-white/70 focus:outline-none focus:border-[#254454]"
            />

            <ColorRingPicker
              value={newColor}
              onChange={setNewColor}
              colors={FOLDER_COLORS.slice(0, 5)}
              compact
            />

            <button
              type="submit"
              className="ios-press inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#254454] text-white text-xs font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Folder
            </button>
          </div>
        </form>
      )}

      {/* Frosted Glass Folders standing on Real 3D Bookshelf Ledges */}
      <div className="space-y-8 pt-2">
        {Array.from({ length: Math.ceil(folders.length / 4) }, (_, rowIdx) =>
          folders.slice(rowIdx * 4, rowIdx * 4 + 4)
        ).map((rowFolders, rowIdx) => (
          <div key={rowIdx} className="relative">
            <div className="flex flex-wrap items-end gap-6 sm:gap-8 px-4 sm:px-6">
              {rowFolders.map((folder) => {
                const isRenaming = renamingId === folder.id;
                return (
                  <div
                    key={folder.id}
                    className={`group relative transition-opacity duration-150 ${
                      openingState?.folder.id === folder.id ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => !isRenaming && triggerOpenFolder(folder, e.currentTarget)}
                      className="ios-press relative text-left focus:outline-none block"
                    >
                      <div className="absolute -bottom-1 inset-x-2 h-2.5 bg-black/40 blur-[4px] rounded-full transition-all duration-200 group-hover:scale-x-90 group-hover:opacity-60" />
                      <div className="relative transition-transform duration-200 group-hover:-translate-y-2 flex flex-col items-center">
                        <GlassFolderIcon color={folder.color} size={144} />
                        <div className="absolute bottom-3.5 inset-x-3 text-center">
                          {isRenaming ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleRename(folder.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                autoFocus
                                value={renameVal}
                                onChange={(e) => setRenameVal(e.target.value)}
                                onBlur={() => handleRename(folder.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                className="w-full px-2 py-0.5 text-xs font-bold rounded-md bg-white text-[#1C1C1E] focus:outline-none text-center"
                              />
                            </form>
                          ) : (
                            <span className="text-xs font-bold text-white drop-shadow line-clamp-1">
                              {folder.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Hover Rename / Delete Controls */}
                    <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(folder.id);
                          setRenameVal(folder.name);
                        }}
                        title="Rename folder"
                        className="p-1.5 rounded-full bg-white shadow-md text-[#52525B] hover:text-[#1C1C1E]"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {folders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder.id)}
                          title="Delete folder"
                          className="p-1.5 rounded-full bg-white shadow-md text-[#52525B] hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="book-shelf-ledge w-full relative z-10" />
          </div>
        ))}
      </div>

      {/* 3D Folder: Glide from Shelf -> Center -> Open & Fan Papers -> Smooth Zoom (matching Notebook) */}
      {openingState && (() => {
        const { fromRect, stage, folder } = openingState;
        const dx =
          typeof window !== 'undefined'
            ? window.innerWidth / 2 - (fromRect.left + fromRect.width / 2)
            : 0;
        const dy =
          typeof window !== 'undefined'
            ? window.innerHeight / 2 - (fromRect.top + fromRect.height / 2)
            : 0;
        const scale =
          stage === 'start' ? 1 : stage === 'center' ? 1.65 : stage === 'open' ? 1.7 : 3.8;
        const tx = stage === 'start' ? 0 : dx;
        const ty = stage === 'start' ? 0 : dy;
        const isOpen = stage === 'open' || stage === 'zoom';

        return (
          <div
            className="fixed inset-0 z-50 pointer-events-none transition-all duration-300"
            style={{
              backgroundColor:
                stage === 'start'
                  ? 'rgba(0, 0, 0, 0)'
                  : stage === 'zoom'
                    ? 'rgba(0, 0, 0, 0.12)'
                    : 'rgba(0, 0, 0, 0.38)',
              backdropFilter: stage === 'start' ? 'none' : 'blur(6px)',
            }}
          >
            <div
              style={{
                position: 'fixed',
                left: fromRect.left,
                top: fromRect.top,
                width: fromRect.width,
                height: fromRect.height,
                perspective: '1600px',
                transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
                opacity: stage === 'zoom' ? 0 : 1,
                transition:
                  'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease-out',
              }}
            >
              {/* Back Folder Shell */}
              <div
                className="absolute inset-x-1 top-1 bottom-2 rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.38)]"
                style={{
                  background: `linear-gradient(135deg, ${folder.color} 0%, #141418 100%)`,
                }}
              />

              {/* Paper Sheet 3 (Back-Right) */}
              <div
                className="absolute left-10 right-3 top-3 bottom-4 rounded-lg bg-slate-100 border border-slate-200 shadow-md p-2.5"
                style={{
                  transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: isOpen ? 'translateY(-36px) rotate(6deg)' : 'translateY(0) rotate(3deg)',
                }}
              >
                <div className="h-1.5 w-10 bg-slate-300 rounded mb-1.5" />
                <div className="h-1 w-14 bg-slate-200 rounded" />
              </div>

              {/* Paper Sheet 2 (Middle) */}
              <div
                className="absolute left-6 right-5 top-2.5 bottom-4 rounded-lg bg-slate-50 border border-slate-200 shadow-md p-2.5"
                style={{
                  transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: isOpen ? 'translateY(-46px) rotate(-2deg)' : 'translateY(0) rotate(1deg)',
                }}
              >
                <div className="h-1.5 w-12 bg-slate-300 rounded mb-1.5" />
                <div className="h-1 w-16 bg-slate-200 rounded" />
              </div>

              {/* Paper Sheet 1 (Hero Front Paper) */}
              <div
                className="absolute left-3.5 right-6 top-3 bottom-3.5 rounded-xl bg-white border border-slate-200 shadow-xl p-3 z-20"
                style={{
                  transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: isOpen
                    ? 'translateY(-54px) rotate(-3deg) scale(1.04)'
                    : 'translateY(0) rotate(-4deg) scale(1)',
                }}
              >
                <div className="space-y-1.5">
                  <div className="h-2 w-14 bg-slate-300 rounded" />
                  <div className="h-1 w-20 bg-slate-200 rounded" />
                  <div className="h-1 w-12 bg-slate-200 rounded" />
                  <div className="h-1 w-16 bg-slate-200 rounded" />
                </div>
              </div>

              {/* Frosted Translucent Front Pocket (tilts forward in 3D) */}
              <div
                className="absolute inset-x-1 bottom-1.5 top-9 rounded-2xl border border-white/45 shadow-xl flex items-end justify-center pb-2.5 origin-bottom z-30"
                style={{
                  transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                  background: `linear-gradient(155deg, ${folder.color}CC 0%, #0F172AE8 100%)`,
                  transform: isOpen ? 'rotateX(-52deg) translateY(5px)' : 'rotateX(0deg)',
                }}
              >
                <span className="text-xs font-bold text-white drop-shadow truncate px-2">
                  {folder.name}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
