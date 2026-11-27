import React, { useEffect, useState } from 'react';
import {
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
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

            <div className="flex items-center gap-1.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    newColor === c ? 'scale-115 ring-2 ring-offset-2 ring-[#1C1C1E]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title="Choose folder color"
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                title="Custom color"
                className="w-6 h-6 rounded-full border-0 bg-transparent cursor-pointer p-0"
              />
            </div>

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
                  <div key={folder.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => !isRenaming && onOpenFolder(folder)}
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
    </div>
  );
};
