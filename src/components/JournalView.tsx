import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  BookOpen,
  Calculator,
  CheckSquare,
  ChevronDown,
  Download,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  PenTool,
  Plus,
  Search,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { formatDateShort } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import { handleInlineMathKeyDown, isAutoMathEnabled, setAutoMathEnabled } from '../lib/mathEval';
import {
  getJournalBookColor as getEntryBookColor,
  getJournalBookName as getEntryBookName,
  getJournalPageSnippet as getPageSnippet,
} from '../lib/pinboard';
import { ConfirmModal } from './ConfirmModal';
import { ColorRingPicker } from './ColorRingPicker';

const BOOK_COLORS = ['#0A5386', '#254454', '#133F47', '#8B1E1E', '#1B5E5A', '#2F333C'];

function getDisplayTags(tags: string[]): string[] {
  return tags.filter((t) => !t.startsWith('book:') && !t.startsWith('color:'));
}

export const JournalView: React.FC = () => {
  const {
    journalEntries,
    projects,
    currentUser,
    liveTypingMap,
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    broadcastTyping,
  } = useLdoi();

  const [openBookName, setOpenBookName] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [newBookInput, setNewBookInput] = useState('');
  const [newBookColor, setNewBookColor] = useState(BOOK_COLORS[0]);
  const [newBookFirstPage, setNewBookFirstPage] = useState('');
  const [customBooks, setCustomBooks] = useState<{ name: string; color: string }[]>(() => {
    try {
      const raw = localStorage.getItem('ldoi_custom_books_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistCustomBooks = (
    updater: (prev: { name: string; color: string }[]) => { name: string; color: string }[]
  ) => {
    setCustomBooks((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('ldoi_custom_books_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [tagInput, setTagInput] = useState('');
  const [fontColor, setFontColor] = useState('#18181B');
  const [autoMath, setAutoMath] = useState(() => isAutoMathEnabled());
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Stylus Drawing Overlay State (persisted per page)
  const [drawMode, setDrawMode] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [penColor, setPenColor] = useState('#18181B');
  const [penWidth, setPenWidth] = useState(2.5);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastDrawPtRef = useRef<{ x: number; y: number } | null>(null);
  interface NotebookStroke {
    id: string;
    color: string;
    width: number;
    points: { x: number; y: number; p: number }[];
  }
  const pageStrokesRef = useRef<Record<string, NotebookStroke[]>>((() => {
    try {
      const raw = localStorage.getItem('ldoi_notebook_strokes_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })());
  const activeStrokeRef = useRef<NotebookStroke | null>(null);

  // Page Extra Height (persisted per page via downward expand arrow)
  const [pageExtraHeights, setPageExtraHeights] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('ldoi_notebook_heights_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Free-floating, draggable & resizable images per notebook page
  interface NotebookFloatingImage {
    id: string;
    src: string;
    alt: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }
  const [pageImages, setPageImages] = useState<Record<string, NotebookFloatingImage[]>>(() => {
    try {
      const raw = localStorage.getItem('ldoi_notebook_images_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [selectedImgId, setSelectedImgId] = useState<string | null>(null);

  const persistPageImages = (
    updater: (prev: Record<string, NotebookFloatingImage[]>) => Record<string, NotebookFloatingImage[]>
  ) => {
    setPageImages((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('ldoi_notebook_images_v1', JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deleteBookTarget, setDeleteBookTarget] = useState<{
    name: string;
    pageIds: string[];
  } | null>(null);
  const [openingBook, setOpeningBook] = useState<{
    name: string;
    color: string;
    firstPageId: string | null;
    fromRect: { left: number; top: number; width: number; height: number };
    stage: 'start' | 'center' | 'open' | 'zoom';
  } | null>(null);
  const openTimersRef = useRef<number[]>([]);

  const clearOpenTimers = () => {
    openTimersRef.current.forEach((t) => window.clearTimeout(t));
    openTimersRef.current = [];
  };

  useEffect(() => clearOpenTimers, []);

  const triggerOpenBook = (
    book: { name: string; color: string },
    firstPageId: string | null,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    clearOpenTimers();
    persistCustomBooks((prev) =>
      prev.some((b) => b.name === book.name) ? prev : [...prev, { name: book.name, color: book.color }]
    );
    const r = e.currentTarget.getBoundingClientRect();
    setOpeningBook({
      name: book.name,
      color: book.color,
      firstPageId,
      fromRect: { left: r.left, top: r.top, width: r.width, height: r.height },
      stage: 'start',
    });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setOpeningBook((prev) => (prev ? { ...prev, stage: 'center' } : null));
      });
    });

    const t1 = window.setTimeout(() => {
      setOpeningBook((prev) => (prev ? { ...prev, stage: 'open' } : null));
    }, 280);

    const t2 = window.setTimeout(() => {
      setOpeningBook((prev) => (prev ? { ...prev, stage: 'zoom' } : null));
    }, 580);

    const t3 = window.setTimeout(() => {
      setOpenBookName(book.name);
      setSelectedId(firstPageId);
      setOpeningBook(null);
    }, 860);

    openTimersRef.current = [t1, t2, t3];
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const lastLocalEditRef = useRef<number>(0);
  const lastTitleEditRef = useRef<number>(0);
  const latestDraftRef = useRef<string>('');
  const latestTitleRef = useRef<string>('');
  const lastEntryIdRef = useRef<string | null>(null);

  // Books derived only from existing team entries + newly created books
  const books = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    let idx = 0;
    for (const entry of journalEntries) {
      const bName = getEntryBookName(entry);
      const taggedColor = getEntryBookColor(entry);
      if (!map.has(bName)) {
        map.set(bName, {
          name: bName,
          color: taggedColor ?? BOOK_COLORS[idx % BOOK_COLORS.length],
        });
        idx++;
      } else if (taggedColor) {
        map.get(bName)!.color = taggedColor;
      }
    }
    for (const cb of customBooks) {
      if (!map.has(cb.name)) {
        map.set(cb.name, {
          name: cb.name,
          color: cb.color,
        });
        idx++;
      }
    }
    return Array.from(map.values());
  }, [journalEntries, customBooks]);

  const bookPages = useMemo(() => {
    if (!openBookName) return [];
    return journalEntries.filter((e) => getEntryBookName(e) === openBookName);
  }, [journalEntries, openBookName]);

  const activeEntry =
    bookPages.find((e) => e.id === selectedId) ?? bookPages[0] ?? null;

  const typingKey = activeEntry ? `journal:${activeEntry.id}` : '';
  const titleTypingKey = activeEntry ? `journal-title:${activeEntry.id}` : '';
  const incomingTyping = typingKey ? liveTypingMap[typingKey] : undefined;
  const incomingTitleTyping = titleTypingKey ? liveTypingMap[titleTypingKey] : undefined;

  useEffect(() => {
    if (!activeEntry) return;
    const switchedEntry = lastEntryIdRef.current !== activeEntry.id;
    if (switchedEntry) {
      lastEntryIdRef.current = activeEntry.id;
      lastLocalEditRef.current = 0;
      lastTitleEditRef.current = 0;
    }
    const now = Date.now();
    const recentlyEditedContent = now - lastLocalEditRef.current < 1800;
    if (
      (switchedEntry || !recentlyEditedContent) &&
      (!incomingTyping || incomingTyping.author === currentUser?.name)
    ) {
      latestDraftRef.current = activeEntry.content;
      if (editorRef.current && (switchedEntry || document.activeElement !== editorRef.current)) {
        editorRef.current.innerHTML = activeEntry.content;
      }
    }
    const recentlyEditedTitle = now - lastTitleEditRef.current < 1800;
    if (
      (switchedEntry || !recentlyEditedTitle) &&
      (!incomingTitleTyping || incomingTitleTyping.author === currentUser?.name)
    ) {
      setDraftTitle(activeEntry.title);
      latestTitleRef.current = activeEntry.title;
    }
  }, [
    activeEntry?.id,
    activeEntry?.content,
    activeEntry?.title,
    incomingTyping,
    incomingTitleTyping,
    currentUser?.name,
    activeEntry,
  ]);

  useEffect(() => {
    if (incomingTyping && incomingTyping.author !== currentUser?.name) {
      latestDraftRef.current = incomingTyping.text;
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = incomingTyping.text;
      }
    }
  }, [incomingTyping, currentUser?.name]);

  useEffect(() => {
    if (incomingTitleTyping && incomingTitleTyping.author !== currentUser?.name) {
      setDraftTitle(incomingTitleTyping.text);
      latestTitleRef.current = incomingTitleTyping.text;
    }
  }, [incomingTitleTyping, currentUser?.name]);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBookInput.trim();
    if (!clean) return;
    persistCustomBooks((prev) =>
      prev.some((b) => b.name === clean) ? prev : [...prev, { name: clean, color: newBookColor }]
    );
    setShowNewBookModal(false);
    setNewBookInput('');
    setOpenBookName(clean);
    const created = await createJournalEntry({
      kind: 'Idea',
      title: newBookFirstPage.trim() || 'Page 1',
      content: '',
      tags: [`book:${clean}`, `color:${newBookColor}`],
    });
    setNewBookFirstPage('');
    setSelectedId(created.id);
  };

  const handleDeleteBook = (bookName: string, pageIds: string[]) => {
    setDeleteBookTarget({ name: bookName, pageIds });
  };

  const confirmDeleteBook = async () => {
    if (!deleteBookTarget) return;
    const { name: bookName, pageIds } = deleteBookTarget;
    setDeleteBookTarget(null);
    for (const id of pageIds) {
      await deleteJournalEntry(id);
    }
    persistCustomBooks((prev) => prev.filter((b) => b.name !== bookName));
    if (openBookName === bookName) {
      setOpenBookName(null);
      setSelectedId(null);
    }
  };

  const handleCreatePage = async () => {
    if (!openBookName) return;
    const pageNum = journalEntries.filter((e) => getEntryBookName(e) === openBookName).length + 1;
    const created = await createJournalEntry({
      kind: 'Idea',
      title: `Page ${pageNum}`,
      content: '',
      tags: [`book:${openBookName}`],
    });
    setSelectedId(created.id);
  };

  const handleTitleChange = (val: string) => {
    if (!activeEntry) return;
    lastTitleEditRef.current = Date.now();
    latestTitleRef.current = val;
    setDraftTitle(val);
    broadcastTyping(`journal-title:${activeEntry.id}`, val);
    if (titleSaveTimerRef.current) window.clearTimeout(titleSaveTimerRef.current);
    const targetId = activeEntry.id;
    titleSaveTimerRef.current = window.setTimeout(() => {
      updateJournalEntry(targetId, { title: latestTitleRef.current });
    }, 350);
  };

  const handleContentChange = (val: string) => {
    if (!activeEntry) return;
    lastLocalEditRef.current = Date.now();
    latestDraftRef.current = val;
    broadcastTyping(`journal:${activeEntry.id}`, val);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const targetId = activeEntry.id;
    saveTimerRef.current = window.setTimeout(() => {
      updateJournalEntry(targetId, { content: latestDraftRef.current });
    }, 350);
  };

  const handleAddTag = (raw: string) => {
    if (!activeEntry) return;
    const clean = raw.trim().replace(/^#+/, '');
    if (!clean || activeEntry.tags.includes(clean)) {
      setTagInput('');
      return;
    }
    updateJournalEntry(activeEntry.id, { tags: [...activeEntry.tags, clean] });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!activeEntry) return;
    updateJournalEntry(activeEntry.id, {
      tags: activeEntry.tags.filter((t) => t !== tag),
    });
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // ignore if unsupported
    }
    document.execCommand(command, false, value);
    saveSelection();
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML);
    }
  };

  // --- Notebook Image Upload / Paste / Drop (small initial size, draggable & resizable anywhere on page) ---
  const insertImageFile = (file: File) => {
    if (!file.type.startsWith('image/') || !activeEntry) return;
    const targetPageId = activeEntry.id;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const maxStoredW = 900;
        let finalUrl = dataUrl;
        if (img.width > maxStoredW) {
          const scale = maxStoredW / img.width;
          const c = document.createElement('canvas');
          c.width = maxStoredW;
          c.height = Math.round(img.height * scale);
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, c.width, c.height);
            finalUrl = c.toDataURL('image/jpeg', 0.86);
          }
        }
        // Keep initial size small so it's easy to place & resize anywhere
        const initW = Math.min(180, Math.max(100, img.width));
        const aspect = img.height > 0 && img.width > 0 ? img.height / img.width : 0.75;
        const initH = Math.max(60, Math.round(initW * aspect));
        const newImgId = `nbimg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

        persistPageImages((prev) => {
          const curList = prev[targetPageId] ?? [];
          const offset = (curList.length % 5) * 20;
          const nextImg: NotebookFloatingImage = {
            id: newImgId,
            src: finalUrl,
            alt: file.name || 'Notebook image',
            x: 24 + offset,
            y: 24 + offset,
            w: initW,
            h: initH,
          };
          return { ...prev, [targetPageId]: [...curList, nextImg] };
        });
        setSelectedImgId(newImgId);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // --- Notebook Page Height Expansion ---
  const activeExtraHeight = activeEntry ? pageExtraHeights[activeEntry.id] ?? 0 : 0;
  const expandPageHeight = () => {
    if (!activeEntry) return;
    setPageExtraHeights((prev) => {
      const next = { ...prev, [activeEntry.id]: (prev[activeEntry.id] ?? 0) + 240 };
      try {
        localStorage.setItem('ldoi_notebook_heights_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // --- Stylus Drawing Canvas Persistence (Stroke-based for Whole-Stroke Erasing) ---
  const redrawStrokesOnCanvas = (canvas: HTMLCanvasElement, strokes: NotebookStroke[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, stroke.width * pt.p) / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        ctx.lineWidth = Math.max(1, stroke.width * curr.p);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const saveDrawingForPage = (pageId: string) => {
    const canvas = drawCanvasRef.current;
    try {
      localStorage.setItem('ldoi_notebook_strokes_v1', JSON.stringify(pageStrokesRef.current));
    } catch {
      // ignore
    }
    if (!canvas) return;
    try {
      const raw = localStorage.getItem('ldoi_notebook_drawings_v1');
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      map[pageId] = canvas.toDataURL('image/png');
      localStorage.setItem('ldoi_notebook_drawings_v1', JSON.stringify(map));
    } catch {
      // ignore storage quota
    }
  };

  const distToSegmentSq = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
  ) => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return (px - cx) * (px - cx) + (py - cy) * (py - cy);
  };

  const eraseStrokeAtPoint = (pageId: string, x: number, y: number) => {
    const strokes = pageStrokesRef.current[pageId] ?? [];
    if (strokes.length === 0) return;
    const remaining = strokes.filter((s) => {
      const thresh = Math.max(12, s.width * 2.5);
      const threshSq = thresh * thresh;
      if (s.points.length === 1) {
        const pt = s.points[0];
        return (x - pt.x) * (x - pt.x) + (y - pt.y) * (y - pt.y) > threshSq;
      }
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1];
        const b = s.points[i];
        if (distToSegmentSq(x, y, a.x, a.y, b.x, b.y) <= threshSq) {
          return false;
        }
      }
      return true;
    });
    if (remaining.length !== strokes.length) {
      pageStrokesRef.current[pageId] = remaining;
      if (drawCanvasRef.current) {
        redrawStrokesOnCanvas(drawCanvasRef.current, remaining);
      }
      saveDrawingForPage(pageId);
    }
  };

  const clearDrawingForPage = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !activeEntry) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    delete pageStrokesRef.current[activeEntry.id];
    try {
      localStorage.setItem('ldoi_notebook_strokes_v1', JSON.stringify(pageStrokesRef.current));
      const raw = localStorage.getItem('ldoi_notebook_drawings_v1');
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      delete map[activeEntry.id];
      localStorage.setItem('ldoi_notebook_drawings_v1', JSON.stringify(map));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    const editor = editorRef.current;
    if (!canvas || !editor || !activeEntry) return;

    const targetW = Math.max(300, editor.clientWidth);
    const targetH = Math.max(320 + activeExtraHeight, editor.scrollHeight, editor.clientHeight);
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.dataset.pageId = activeEntry.id;

    const strokes = pageStrokesRef.current[activeEntry.id] ?? [];
    if (strokes.length > 0) {
      redrawStrokesOnCanvas(canvas, strokes);
    } else {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, targetW, targetH);
      try {
        const raw = localStorage.getItem('ldoi_notebook_drawings_v1');
        const map: Record<string, string> = raw ? JSON.parse(raw) : {};
        const saved = map[activeEntry.id];
        if (saved && ctx) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = saved;
        }
      } catch {
        // ignore
      }
    }
  }, [activeEntry?.id, activeExtraHeight]);

  // --- Export Notes (PDF, PNG Image, Markdown, HTML) ---
  const exportNoteAs = (format: 'pdf' | 'png' | 'md' | 'html') => {
    if (!activeEntry) return;
    setShowExportMenu(false);
    const title = activeEntry.title.trim() || 'Untitled Note';
    const safeName = title.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 60) || 'note';
    const htmlBody = editorRef.current?.innerHTML ?? activeEntry.content ?? '';
    const drawingUrl = drawCanvasRef.current?.toDataURL('image/png') ?? '';
    const floatingImgs = pageImages[activeEntry.id] ?? [];
    const editorW = Math.max(300, editorRef.current?.clientWidth || 720);
    const minSheetH = Math.max(
      320 + activeExtraHeight,
      ...floatingImgs.map((im) => im.y + im.h + 24)
    );
    const floatingImgsHtml = floatingImgs
      .map(
        (im) =>
          `<img src="${im.src}" alt="${im.alt.replace(/"/g, '&quot;')}" style="position:absolute;left:${im.x}px;top:${im.y}px;width:${im.w}px;height:${im.h}px;object-fit:contain;border-radius:8px;z-index:5;" />`
      )
      .join('');

    if (format === 'html') {
      const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:820px;margin:40px auto;padding:24px;color:#18181B;background:#FCFBF8;line-height:1.7;}img{max-width:100%;border-radius:8px;}.sheet{position:relative;min-height:${minSheetH}px;}.ink{position:absolute;inset:0;width:100%;pointer-events:none;z-index:10;}</style></head><body><h1>${title}</h1><div class="sheet">${htmlBody}${floatingImgsHtml}${drawingUrl ? `<img class="ink" src="${drawingUrl}" alt="Stylus ink" />` : ''}</div></body></html>`;
      const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'md') {
      const tmp = document.createElement('div');
      tmp.innerHTML = htmlBody;
      const text = (tmp.innerText || tmp.textContent || '').trim();
      const imgMd = floatingImgs.map((im) => `![${im.alt}](${im.src})`).join('\n\n');
      const md = `# ${title}\n\n${text}${imgMd ? `\n\n${imgMd}` : ''}\n`;
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.md`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'pdf') {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return;
      win.document.write(`<!doctype html><html><head><title>${title}</title><style>@page{margin:16mm;}body{font-family:system-ui,-apple-system,sans-serif;color:#18181B;line-height:1.7;}h1{font-size:22px;margin-bottom:12px;border-bottom:1px solid #E4E2DC;padding-bottom:8px;}img{max-width:100%;border-radius:8px;}.sheet{position:relative;min-height:${minSheetH}px;}.ink{position:absolute;inset:0;width:100%;pointer-events:none;z-index:10;}</style></head><body><h1>${title}</h1><div class="sheet">${htmlBody}${floatingImgsHtml}${drawingUrl ? `<img class="ink" src="${drawingUrl}" alt="" />` : ''}</div><script>window.onload=()=>{setTimeout(()=>{window.print();},250);};</script></body></html>`);
      win.document.close();
      return;
    }

    // PNG Image export
    const canvas = document.createElement('canvas');
    const w = 1200;
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlBody;
    const rawLines = (tmp.innerText || '').split('\n');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const wrappedLines: string[] = [];
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    for (const line of rawLines) {
      const words = line.split(' ');
      let cur = '';
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > w - 120) {
          if (cur) wrappedLines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      wrappedLines.push(cur);
    }

    const scaleX = (w - 96) / editorW;
    const maxImgBottom = floatingImgs.reduce(
      (acc, im) => Math.max(acc, Math.round(100 + (im.y + im.h) * scaleX + 40)),
      0
    );
    const h = Math.max(820, 180 + wrappedLines.length * 36, maxImgBottom);
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#FCFBF8';
    ctx.fillRect(0, 0, w, h);

    // Ruled lines
    ctx.strokeStyle = 'rgba(10, 83, 134, 0.14)';
    ctx.lineWidth = 1;
    for (let y = 132; y < h - 40; y += 36) {
      ctx.beginPath();
      ctx.moveTo(48, y);
      ctx.lineTo(w - 48, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#18181B';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, 60, 82);

    ctx.font = '22px system-ui, -apple-system, sans-serif';
    wrappedLines.forEach((ln, idx) => {
      ctx.fillText(ln, 60, 126 + idx * 36);
    });

    const finalizePng = () => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${safeName}.png`;
      a.click();
    };

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    void (async () => {
      for (const im of floatingImgs) {
        const loaded = await loadImg(im.src);
        if (loaded) {
          ctx.drawImage(
            loaded,
            48 + im.x * scaleX,
            100 + im.y * scaleX,
            im.w * scaleX,
            im.h * scaleX
          );
        }
      }
      if (drawingUrl) {
        const inkImg = await loadImg(drawingUrl);
        if (inkImg) {
          ctx.drawImage(
            inkImg,
            48,
            100,
            w - 96,
            Math.min(h - 120, (inkImg.height / Math.max(1, inkImg.width)) * (w - 96))
          );
        }
      }
      finalizePng();
    })();
  };

  const createCheckRowElement = (initialText = ''): HTMLDivElement => {
    const row = document.createElement('div');
    row.className = 'ldoi-check-row';
    row.setAttribute('data-checked', 'false');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ldoi-check-input';
    cb.setAttribute('contenteditable', 'false');

    const span = document.createElement('span');
    span.className = 'ldoi-check-text';
    span.textContent = initialText || '\u200B';

    row.appendChild(cb);
    row.appendChild(span);
    return row;
  };

  const placeCaretInCheckText = (span: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(span);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };

  const insertCheckbox = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (savedRangeRef.current && sel && editor.contains(savedRangeRef.current.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    const activeRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const selectedText = activeRange ? activeRange.toString().trim() : '';
    const row = createCheckRowElement(selectedText);

    if (activeRange && editor.contains(activeRange.commonAncestorContainer)) {
      activeRange.deleteContents();
      const existingRow = (
        activeRange.startContainer.nodeType === Node.TEXT_NODE
          ? activeRange.startContainer.parentElement
          : (activeRange.startContainer as HTMLElement)
      )?.closest('.ldoi-check-row');
      if (existingRow && existingRow.parentNode) {
        existingRow.parentNode.insertBefore(row, existingRow.nextSibling);
      } else {
        activeRange.insertNode(row);
      }
    } else {
      editor.appendChild(row);
    }

    const span = row.querySelector('.ldoi-check-text') as HTMLElement | null;
    if (span) placeCaretInCheckText(span);
    handleContentChange(editor.innerHTML);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (handleInlineMathKeyDown(e, handleContentChange)) return;
    if (e.key !== 'Enter' || e.shiftKey) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchorEl =
      sel.anchorNode?.nodeType === Node.TEXT_NODE
        ? sel.anchorNode.parentElement
        : (sel.anchorNode as HTMLElement | null);
    const checkRow = anchorEl?.closest('.ldoi-check-row') as HTMLElement | null;
    if (!checkRow || !editorRef.current?.contains(checkRow)) return;

    e.preventDefault();
    const textEl = checkRow.querySelector('.ldoi-check-text') as HTMLElement | null;
    const rawText = (textEl?.textContent ?? '').replace(/\u200B/g, '').trim();

    if (!rawText) {
      // Empty checklist item: exit checklist mode on Enter
      const emptyLine = document.createElement('div');
      emptyLine.innerHTML = '<br>';
      checkRow.replaceWith(emptyLine);
      const range = document.createRange();
      range.setStart(emptyLine, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    } else {
      const nextRow = createCheckRowElement('');
      checkRow.parentNode?.insertBefore(nextRow, checkRow.nextSibling);
      const nextSpan = nextRow.querySelector('.ldoi-check-text') as HTMLElement | null;
      if (nextSpan) placeCaretInCheckText(nextSpan);
    }
    handleContentChange(editorRef.current.innerHTML);
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const cb = target as HTMLInputElement;
      if (cb.checked) {
        cb.setAttribute('checked', 'checked');
      } else {
        cb.removeAttribute('checked');
      }
      const row = cb.closest('.ldoi-check-row');
      if (row) {
        row.setAttribute('data-checked', cb.checked ? 'true' : 'false');
      }
      if (editorRef.current) {
        handleContentChange(editorRef.current.innerHTML);
      }
    }
  };

  // BOOKSHELF VIEW (Apple Books 3D Shelf Ledges)
  if (!openBookName) {
    const visibleBooks = books.filter((b) =>
      bookSearch.trim()
        ? b.name.toLowerCase().includes(bookSearch.toLowerCase())
        : true
    );

    // Group into shelf rows of up to 5 books each
    const shelfRows: typeof books[] = [];
    for (let i = 0; i < visibleBooks.length; i += 5) {
      shelfRows.push(visibleBooks.slice(i, i + 5));
    }

    return (
      <div className="space-y-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl font-semibold text-[#18181B] dark:text-white">
              Book Shelf
            </h1>
            <p className="text-xs text-[#71717A] dark:text-zinc-400 mt-0.5">
              Your 3D notebook shelf — open any book to read and write study notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-2" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search books..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] w-40"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setNewBookInput('');
                setNewBookFirstPage('');
                setNewBookColor(BOOK_COLORS[books.length % BOOK_COLORS.length]);
                setShowNewBookModal(true);
              }}
              className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> New Book
            </button>
          </div>
        </div>

        {shelfRows.length === 0 ? (
          <div className="pt-8">
            <div className="py-12 text-center text-xs text-[#71717A]">
              No books on the shelf yet. Click <strong>New Book</strong> to create your first notebook.
            </div>
            <div className="book-shelf-ledge w-full" />
          </div>
        ) : (
          <div className="space-y-10">
            {shelfRows.map((rowBooks, rowIdx) => (
              <div key={rowIdx} className="pt-2">
                <div className="flex flex-wrap items-end gap-5 sm:gap-7 px-4 sm:px-6">
                  {rowBooks.map((book) => {
                    const pages = journalEntries.filter((e) => getEntryBookName(e) === book.name);
                    return (
                      <div key={book.name} className="group relative">
                        <div className="book-spotlight" />
                        <button
                          type="button"
                          onClick={(e) => triggerOpenBook(book, pages[0]?.id ?? null, e)}
                          className="ios-press relative text-left focus:outline-none block"
                        >
                          <div className="absolute -bottom-1 inset-x-1 h-2.5 bg-black/45 blur-[4px] rounded-full transition-all duration-200 group-hover:scale-x-90 group-hover:opacity-60" />

                          <div
                            className="relative w-32 sm:w-36 h-44 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_8px_18px_rgba(0,0,0,0.38)] overflow-hidden transition-transform duration-200 group-hover:-translate-y-2"
                            style={{ backgroundColor: book.color }}
                          >
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                              }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                              }}
                            />
                            <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />
                            <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />

                            <div
                              className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                              style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                              }}
                            />

                            <div className="relative z-10 pl-3.5 pr-2 pt-3">
                              <h3 className="text-sm font-bold leading-snug text-white drop-shadow-2xs line-clamp-3">
                                {book.name}
                              </h3>
                            </div>

                            <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                              <span>{pages.length} {pages.length === 1 ? 'pg' : 'pgs'}</span>
                              <BookOpen className="w-3 h-3 opacity-80" />
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="book-shelf-ledge w-full relative z-10" />
              </div>
            ))}
          </div>
        )}

        {/* Upgraded Add Book Modal with Live 3D Cover Preview */}
        {showNewBookModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateBook}
              className="w-full max-w-lg paper-card rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-[#E4E2DC] flex items-center justify-between">
                <div className="text-sm font-semibold text-[#18181B]">Create New Book</div>
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="p-1 text-[#71717A] hover:text-[#18181B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 grid sm:grid-cols-12 gap-5 items-center">
                {/* Live 3D Hardcover Preview */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center py-2">
                  <div
                    className="relative w-32 h-44 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_10px_22px_rgba(0,0,0,0.35)] overflow-hidden transition-colors duration-200"
                    style={{ backgroundColor: newBookColor }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                      }}
                    />
                    <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />
                    <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />
                    <div
                      className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                      }}
                    />
                    <div className="relative z-10 pl-3.5 pr-2 pt-3">
                      <div className="text-sm font-bold leading-snug text-white line-clamp-3">
                        {newBookInput.trim() || 'Book Title'}
                      </div>
                    </div>
                    <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                      <span>1 pg</span>
                      <BookOpen className="w-3 h-3 opacity-80" />
                    </div>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="sm:col-span-7 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                      Book Title *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newBookInput}
                      onChange={(e) => setNewBookInput(e.target.value)}
                      placeholder="e.g. Hardware & R&D"
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1.5">
                      Cover Color
                    </label>
                    <ColorRingPicker
                      value={newBookColor}
                      onChange={setNewBookColor}
                      colors={BOOK_COLORS.slice(0, 5)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                      First Page Title
                    </label>
                    <input
                      type="text"
                      value={newBookFirstPage}
                      onChange={(e) => setNewBookFirstPage(e.target.value)}
                      placeholder="Page 1"
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[#E4E2DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#52525B] hover:text-[#18181B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-press px-4 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
                >
                  Add to Shelf
                </button>
              </div>
            </form>
          </div>
        )}

        <ConfirmModal
          open={Boolean(deleteBookTarget)}
          title="Delete Book"
          message={
            deleteBookTarget
              ? `Delete "${deleteBookTarget.name}" and its ${deleteBookTarget.pageIds.length === 1
                ? '1 page'
                : `${deleteBookTarget.pageIds.length} pages`
              } from the shelf?`
              : ''
          }
          confirmLabel="Delete Book"
          onConfirm={confirmDeleteBook}
          onCancel={() => setDeleteBookTarget(null)}
        />

        {/* 3D Notebook: Glide from Shelf -> Center -> Open Two-Sided Cover -> Smooth Zoom */}
        {openingBook && (() => {
          const { fromRect, stage } = openingBook;
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
          const isCoverOpen = stage === 'open' || stage === 'zoom';

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
                {/* Inside Cream Ruled Page */}
                <div className="absolute inset-0 rounded-r-lg rounded-l-[3px] ruled-paper shadow-[0_18px_40px_rgba(0,0,0,0.35)] border border-[#E4E2DC] p-3.5 flex flex-col justify-between overflow-hidden">
                  {/* Spine Crease Shadow on Page */}
                  <div
                    className="absolute inset-y-0 left-0 w-4 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(0,0,0,0.16) 0%, transparent 100%)',
                    }}
                  />
                  <div className="relative z-10 pl-2 text-[11px] font-semibold text-[#18181B] truncate">
                    {openingBook.name}
                  </div>
                </div>

                {/* 3D Two-Sided Swinging Hardcover Front */}
                <div
                  className="absolute inset-0"
                  style={{
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    transform: isCoverOpen ? 'rotateY(-138deg)' : 'rotateY(0deg)',
                    transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {/* Outer Front Cover */}
                  <div
                    className="absolute inset-0 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_10px_24px_rgba(0,0,0,0.42)] overflow-hidden"
                    style={{
                      backgroundColor: openingBook.color,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                      }}
                    />
                    <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />
                    <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />
                    <div
                      className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                      }}
                    />
                    <div className="relative z-10 pl-3.5 pr-2 pt-3">
                      <h3 className="text-sm font-bold leading-snug text-white line-clamp-3">
                        {openingBook.name}
                      </h3>
                    </div>
                    <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                      <span>LDOI</span>
                      <BookOpen className="w-3 h-3 opacity-80" />
                    </div>
                  </div>

                  {/* Inner Front Cover Lining (visible after swinging past 90deg) */}
                  <div
                    className="absolute inset-0 rounded-l-lg rounded-r-[3px] bg-[#EDE7DA] border border-[#D8D0C0] shadow-inner overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div
                      className="absolute inset-y-0 right-0 w-4 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(270deg, rgba(0,0,0,0.14) 0%, transparent 100%)',
                      }}
                    />
                    <div className="absolute inset-3 rounded-sm border border-[#D4CCB8]/70 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // OPEN BOOK VIEW (Separate Pages Inside Selected Book)
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpenBookName(null)}
            className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E4E2DC] hover:border-[#0A5386] rounded-lg text-[#18181B]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Books
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#18181B]">{openBookName}</h1>
            <p className="text-[11px] text-[#71717A]">
              {bookPages.length} {bookPages.length === 1 ? 'page' : 'pages'} inside this book
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeEntry && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E4E2DC] hover:border-[#0A5386] text-[#18181B] rounded-lg"
                title="Export Note"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              {showExportMenu && (
                <div
                  onMouseLeave={() => setShowExportMenu(false)}
                  className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E4E2DC] dark:border-white/15 shadow-xl py-1.5 z-40 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => exportNoteAs('pdf')}
                    className="w-full text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 font-medium"
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => exportNoteAs('png')}
                    className="w-full text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 font-medium"
                  >
                    Export as PNG Image
                  </button>
                  <button
                    type="button"
                    onClick={() => exportNoteAs('md')}
                    className="w-full text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 font-medium"
                  >
                    Export as Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => exportNoteAs('html')}
                    className="w-full text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 font-medium"
                  >
                    Export as HTML
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              handleDeleteBook(
                openBookName,
                journalEntries
                  .filter((e) => getEntryBookName(e) === openBookName)
                  .map((p) => p.id)
              )
            }
            title={`Delete ${openBookName}`}
            className="ios-press p-1.5 rounded-lg bg-white border border-[#E4E2DC] hover:border-[#DC2626] text-[#71717A] hover:text-[#DC2626]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreatePage}
            className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> New Page
          </button>
        </div>
      </div>

      {/* Realistic Physical Hardcover Ring-Bound Open Book */}
      <div className="notebook-cover-shell p-3 sm:p-4 rounded-[22px] border border-black/30">
        <div className="notebook-spread relative rounded-xl overflow-hidden grid lg:grid-cols-12 min-h-[560px] bg-[#FCFBF8]">
          {/* Realistic Metallic Twin-Loop Binder Rings + Punched Holes (Desktop) */}
          <div className="hidden lg:flex flex-col justify-evenly items-center absolute left-1/3 -translate-x-1/2 inset-y-4 z-20 pointer-events-none">
            {[0, 1, 2, 3, 4].map((ring) => (
              <div key={ring} className="relative flex items-center justify-center w-11 h-4">
                <span className="absolute left-0.5 w-3 h-3 rounded-full bg-[#1C1B19] border border-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                <span className="absolute right-0.5 w-3 h-3 rounded-full bg-[#1C1B19] border border-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                <span className="relative z-10 w-8 h-2 rounded-full bg-gradient-to-b from-[#F3F4F6] via-[#9CA3AF] to-[#374151] border border-black/35 shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
              </div>
            ))}
          </div>

          {/* Left Page: Pages Index Inside This Book */}
          <div className="lg:col-span-4 notebook-pages-pane border-b lg:border-b-0 lg:border-r p-5 lg:pr-8 flex flex-col shadow-[inset_-16px_0_24px_-16px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52525B]">
                Pages ({bookPages.length})
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {bookPages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#71717A]">
                  This book has no pages yet. Click &ldquo;New Page&rdquo; above.
                </div>
              ) : (
                bookPages.map((entry) => {
                  const selected = activeEntry?.id === entry.id;
                  const customTags = getDisplayTags(entry.tags);
                  const snippet = getPageSnippet(entry.content);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selected ? 'notebook-page-item-active shadow-2xs' : 'notebook-page-item'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-[#18181B] truncate">
                          {entry.title || 'Untitled Page'}
                        </div>
                        <span className="text-[10px] font-medium text-[#71717A] shrink-0">
                          {entry.author}
                        </span>
                      </div>
                      {snippet && (
                        <div className="mt-1 text-[11px] text-[#71717A] truncate">
                          {snippet}
                        </div>
                      )}
                      {customTags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {customTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] font-medium bg-[#0A5386]/15 text-[#38BDF8] rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-[#71717A] font-mono-num">
                        {formatDateShort(entry.updatedAt)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Page: Ruled Paper Rich-Text Live Editor */}
          <div className="lg:col-span-8 notebook-editor-pane p-6 lg:pl-10 flex flex-col shadow-[inset_16px_0_24px_-16px_rgba(0,0,0,0.16)]">
            {!activeEntry ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#71717A]">
                <BookOpen className="w-7 h-7 mb-2" />
                <p className="text-sm font-medium text-[#18181B]">No page selected</p>
                <p className="text-xs mt-1">
                  Click &ldquo;New Page&rdquo; above to start writing in {openBookName}.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#E4E2DC]">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Page title..."
                    className="notebook-title-input flex-1 text-lg font-semibold text-[#18181B] bg-transparent border-0 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {((incomingTyping && incomingTyping.author !== currentUser?.name) ||
                      (incomingTitleTyping && incomingTitleTyping.author !== currentUser?.name)) && (
                        <span className="px-2 py-1 text-[11px] font-medium bg-[#0A5386]/15 text-[#5FA8E0] rounded">
                          {(incomingTyping?.author || incomingTitleTyping?.author)} is typing...
                        </span>
                      )}
                    <button
                      type="button"
                      onClick={() => {
                        const currentBook = books.find((b) => b.name === openBookName);
                        if (currentBook) {
                          persistCustomBooks((prev) =>
                            prev.some((b) => b.name === currentBook.name)
                              ? prev
                              : [...prev, { name: currentBook.name, color: currentBook.color }]
                          );
                        }
                        deleteJournalEntry(activeEntry.id);
                      }}
                      className="p-1.5 text-[#71717A] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Tags Bar */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-[#E4E2DC]">
                  <span className="text-xs font-semibold text-[#52525B]">Tags:</span>
                  {getDisplayTags(activeEntry.tags).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-[#0A5386]/10 text-[#0A5386] rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-[#DC2626]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    onBlur={() => {
                      if (tagInput.trim()) handleAddTag(tagInput);
                    }}
                    placeholder="Type tag & press Enter..."
                    className="notebook-tag-input flex-1 min-w-[140px] px-1.5 py-0.5 text-xs bg-transparent text-[#18181B] border-b border-dashed border-[#D6D0C2] focus:border-[#0A5386] focus:outline-none placeholder:text-[#A1A1AA]"
                  />

                  <select
                    value={activeEntry.projectId ?? ''}
                    onChange={(e) =>
                      updateJournalEntry(activeEntry.id, {
                        projectId: e.target.value || undefined,
                      })
                    }
                    className="ml-auto px-2 py-1 text-[11px] bg-white border border-[#E4E2DC] rounded"
                  >
                    <option value="">General (No linked project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        Project: {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floating Pill Rich-Text Formatting Toolbar */}
                <div className="notebook-toolbar flex flex-wrap items-center gap-1 px-2.5 py-1.5 rounded-full w-fit max-w-full shadow-xs">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('bold');
                    }}
                    title="Bold"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('italic');
                    }}
                    title="Italic"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('underline');
                    }}
                    title="Underline"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('strikeThrough');
                    }}
                    title="Strikethrough"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('hiliteColor', '#FEF08A');
                    }}
                    title="Highlight Selection"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Highlighter className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <label
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 cursor-pointer select-none"
                    title={
                      autoMath
                        ? 'Auto-Calculate on "=" is ON (click to turn off)'
                        : 'Auto-Calculate on "=" is OFF (click to turn on)'
                    }
                  >
                    <Calculator className="w-3.5 h-3.5 opacity-75" />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoMath}
                      onClick={() => {
                        const next = !autoMath;
                        setAutoMath(next);
                        setAutoMathEnabled(next);
                      }}
                      className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-[#9B5B76]/35 transition-colors duration-200"
                      style={{
                        backgroundColor: autoMath ? '#9B5B76' : 'rgba(155, 91, 118, 0.28)',
                      }}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full shadow-xs transition-transform duration-200 ${
                          autoMath ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                        style={{ backgroundColor: '#ffffff' }}
                      />
                    </button>
                  </label>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('insertUnorderedList');
                    }}
                    title="Bullet List"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('insertOrderedList');
                    }}
                    title="Numbered List"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertCheckbox();
                    }}
                    title="Insert Checkbox"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('justifyLeft');
                    }}
                    title="Align Left"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('justifyCenter');
                    }}
                    title="Align Center"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('justifyRight');
                    }}
                    title="Align Right"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <div className="flex items-center gap-1 px-1">
                    {['#F4F4F5', '#3B82F6', '#EF4444', '#10B981'].map((ink) => (
                      <button
                        key={ink}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFontColor(ink);
                          execFormat('foreColor', ink);
                        }}
                        title={`Ink ${ink}`}
                        style={{ backgroundColor: ink }}
                        className={`w-3.5 h-3.5 rounded-full border border-white/30 ${fontColor === ink ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
                          }`}
                      />
                    ))}
                    <label
                      onMouseDown={saveSelection}
                      title="Custom Text Color"
                      className="ml-0.5 inline-flex items-center p-1 rounded-full notebook-tool-btn cursor-pointer"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30"
                        style={{
                          background:
                            'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)',
                        }}
                      />
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => {
                          setFontColor(e.target.value);
                          execFormat('foreColor', e.target.value);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Upload / Import Image & Stylus Drawing Controls */}
                  <div className="flex items-center gap-1 pl-1.5 border-l border-[#E4E2DC]">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        files.forEach(insertImageFile);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onMouseDown={saveSelection}
                      onClick={() => imageInputRef.current?.click()}
                      title="Import / Upload Image to Page"
                      className="notebook-tool-btn p-1.5 rounded-full"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDrawMode((d) => !d);
                        setEraserMode(false);
                      }}
                      title={drawMode ? 'Switch back to typing' : 'Stylus / Pen Drawing Mode'}
                      className={`p-1.5 rounded-full transition-colors ${
                        drawMode
                          ? 'bg-[#0A5386] text-white'
                          : 'notebook-tool-btn'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                    </button>

                    {drawMode && (
                      <>
                        {['#18181B', '#0A5386', '#DC2626', '#16A34A'].map((ink) => (
                          <button
                            key={ink}
                            type="button"
                            onClick={() => {
                              setPenColor(ink);
                              setEraserMode(false);
                            }}
                            title={`Stylus Ink ${ink}`}
                            style={{ backgroundColor: ink }}
                            className={`w-3.5 h-3.5 rounded-full border border-white/40 ${
                              !eraserMode && penColor === ink ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
                            }`}
                          />
                        ))}
                        <select
                          value={penWidth}
                          onChange={(e) => setPenWidth(Number(e.target.value))}
                          title="Stylus Stroke Size"
                          className="text-[10px] font-bold bg-white/80 dark:bg-white/10 rounded px-1 py-0.5 border border-[#E4E2DC]"
                        >
                          <option value={1.5}>Fine</option>
                          <option value={2.5}>Med</option>
                          <option value={5}>Bold</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setEraserMode((e) => !e)}
                          title="Eraser"
                          className={`p-1.5 rounded-full ${
                            eraserMode ? 'bg-amber-500 text-white' : 'notebook-tool-btn'
                          }`}
                        >
                          <Eraser className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={clearDrawingForPage}
                          title="Clear Stylus Ink"
                          className="notebook-tool-btn px-2 py-0.5 rounded-full text-[10px] font-bold text-red-600"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Ruled Rich-Text Writing Area + Stylus Canvas Overlay */}
                <div className="relative flex-1 flex flex-col">
                  <div
                    ref={editorRef}
                    contentEditable={!drawMode}
                    suppressContentEditableWarning
                    onMouseUp={saveSelection}
                    onKeyUp={saveSelection}
                    onKeyDown={handleEditorKeyDown}
                    onClick={handleEditorClick}
                    onPaste={(e) => {
                      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
                        f.type.startsWith('image/')
                      );
                      if (files.length > 0) {
                        e.preventDefault();
                        files.forEach(insertImageFile);
                      }
                    }}
                    onDrop={(e) => {
                      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
                        f.type.startsWith('image/')
                      );
                      if (files.length > 0) {
                        e.preventDefault();
                        files.forEach(insertImageFile);
                      }
                    }}
                    onInput={(e) => {
                      saveSelection();
                      handleContentChange(e.currentTarget.innerHTML);
                    }}
                    style={{ minHeight: `${320 + activeExtraHeight}px` }}
                    data-placeholder="Write down your thoughts, technical findings, or notes..."
                    className="notebook-editor w-full flex-1 p-3 text-sm text-[#18181B] ruled-paper border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-[#A1A1AA]"
                  />

                  {/* Free-Floating Draggable & Resizable Images Layer */}
                  {activeEntry && (pageImages[activeEntry.id] ?? []).length > 0 && (
                    <div
                      className={`absolute inset-0 overflow-hidden rounded-lg z-[5] ${
                        drawMode ? 'pointer-events-none' : 'pointer-events-none'
                      }`}
                    >
                      {(pageImages[activeEntry.id] ?? []).map((imgItem) => {
                        const isSel = selectedImgId === imgItem.id;
                        return (
                          <div
                            key={imgItem.id}
                            style={{
                              left: imgItem.x,
                              top: imgItem.y,
                              width: imgItem.w,
                              height: imgItem.h,
                            }}
                            onPointerDown={(e) => {
                              if (drawMode) return;
                              if ((e.target as HTMLElement).closest('button, [data-resize]')) return;
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedImgId(imgItem.id);
                              const pageId = activeEntry.id;
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const origX = imgItem.x;
                              const origY = imgItem.y;
                              const onMove = (ev: PointerEvent) => {
                                const dx = ev.clientX - startX;
                                const dy = ev.clientY - startY;
                                persistPageImages((prev) => ({
                                  ...prev,
                                  [pageId]: (prev[pageId] ?? []).map((it) =>
                                    it.id === imgItem.id
                                      ? {
                                          ...it,
                                          x: Math.max(0, Math.round(origX + dx)),
                                          y: Math.max(0, Math.round(origY + dy)),
                                        }
                                      : it
                                  ),
                                }));
                              };
                              const onUp = () => {
                                window.removeEventListener('pointermove', onMove);
                                window.removeEventListener('pointerup', onUp);
                              };
                              window.addEventListener('pointermove', onMove);
                              window.addEventListener('pointerup', onUp);
                            }}
                            className={`group absolute rounded-lg shadow-md cursor-grab active:cursor-grabbing select-none ${
                              drawMode ? 'pointer-events-none' : 'pointer-events-auto'
                            } ${isSel ? 'ring-2 ring-[#0A5386]' : 'hover:ring-2 hover:ring-[#0A5386]/50'}`}
                          >
                            <img
                              src={imgItem.src}
                              alt={imgItem.alt}
                              draggable={false}
                              className="w-full h-full object-contain rounded-lg bg-white/40"
                            />
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => {
                                const pageId = activeEntry.id;
                                persistPageImages((prev) => ({
                                  ...prev,
                                  [pageId]: (prev[pageId] ?? []).filter((it) => it.id !== imgItem.id),
                                }));
                                if (selectedImgId === imgItem.id) setSelectedImgId(null);
                              }}
                              title="Remove image"
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#18181B]/85 hover:bg-red-600 text-white flex items-center justify-center shadow"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div
                              data-resize="true"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedImgId(imgItem.id);
                                const pageId = activeEntry.id;
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const origW = imgItem.w;
                                const origH = imgItem.h;
                                const ratio = origH / Math.max(1, origW);
                                const onMove = (ev: PointerEvent) => {
                                  const dx = ev.clientX - startX;
                                  const dy = ev.clientY - startY;
                                  const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy / ratio;
                                  const nextW = Math.max(60, Math.min(720, Math.round(origW + delta)));
                                  const nextH = Math.max(45, Math.round(nextW * ratio));
                                  persistPageImages((prev) => ({
                                    ...prev,
                                    [pageId]: (prev[pageId] ?? []).map((it) =>
                                      it.id === imgItem.id ? { ...it, w: nextW, h: nextH } : it
                                    ),
                                  }));
                                };
                                const onUp = () => {
                                  window.removeEventListener('pointermove', onMove);
                                  window.removeEventListener('pointerup', onUp);
                                };
                                window.addEventListener('pointermove', onMove);
                                window.addEventListener('pointerup', onUp);
                              }}
                              title="Drag to resize image"
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0.5 right-0.5 w-4 h-4 cursor-nwse-resize rounded-sm bg-[#0A5386] text-white flex items-center justify-center shadow"
                            >
                              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
                                <path d="M9 1v8H1L9 1z" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <canvas
                    ref={drawCanvasRef}
                    onPointerDown={(e) => {
                      if (!drawMode || !drawCanvasRef.current || !activeEntry) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pt = {
                        x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
                        y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
                      };
                      isDrawingRef.current = true;
                      lastDrawPtRef.current = pt;
                      if (eraserMode) {
                        eraseStrokeAtPoint(activeEntry.id, pt.x, pt.y);
                        return;
                      }
                      const pressure = e.pressure && e.pressure > 0 ? e.pressure * 1.4 : 1;
                      activeStrokeRef.current = {
                        id: `stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
                        color: penColor,
                        width: penWidth,
                        points: [{ x: pt.x, y: pt.y, p: pressure }],
                      };
                    }}
                    onPointerMove={(e) => {
                      if (!drawMode || !isDrawingRef.current || !drawCanvasRef.current || !lastDrawPtRef.current || !activeEntry) return;
                      const canvas = drawCanvasRef.current;
                      const rect = canvas.getBoundingClientRect();
                      const pt = {
                        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
                        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
                      };
                      if (eraserMode) {
                        eraseStrokeAtPoint(activeEntry.id, pt.x, pt.y);
                        lastDrawPtRef.current = pt;
                        return;
                      }
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      const pressure = e.pressure && e.pressure > 0 ? e.pressure * 1.4 : 1;
                      ctx.save();
                      ctx.lineCap = 'round';
                      ctx.lineJoin = 'round';
                      ctx.globalCompositeOperation = 'source-over';
                      ctx.strokeStyle = penColor;
                      ctx.lineWidth = Math.max(1, penWidth * pressure);
                      ctx.beginPath();
                      ctx.moveTo(lastDrawPtRef.current.x, lastDrawPtRef.current.y);
                      ctx.lineTo(pt.x, pt.y);
                      ctx.stroke();
                      ctx.restore();
                      activeStrokeRef.current?.points.push({ x: pt.x, y: pt.y, p: pressure });
                      lastDrawPtRef.current = pt;
                    }}
                    onPointerUp={() => {
                      if (!isDrawingRef.current) return;
                      isDrawingRef.current = false;
                      lastDrawPtRef.current = null;
                      if (activeEntry && activeStrokeRef.current && !eraserMode) {
                        const existing = pageStrokesRef.current[activeEntry.id] ?? [];
                        pageStrokesRef.current[activeEntry.id] = [...existing, activeStrokeRef.current];
                        activeStrokeRef.current = null;
                        saveDrawingForPage(activeEntry.id);
                      } else {
                        activeStrokeRef.current = null;
                      }
                    }}
                    onPointerCancel={() => {
                      isDrawingRef.current = false;
                      lastDrawPtRef.current = null;
                      activeStrokeRef.current = null;
                    }}
                    className={`absolute inset-0 w-full h-full rounded-lg z-10 ${
                      drawMode ? 'pointer-events-auto touch-none cursor-crosshair' : 'pointer-events-none'
                    }`}
                  />
                </div>

                {/* Small Downward Arrow Under the Page to Add More Page Size */}
                <div className="flex justify-center pt-1.5">
                  <button
                    type="button"
                    onClick={expandPageHeight}
                    title="Add more space to this page"
                    className="ios-press inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-[#6E6E73] hover:text-[#18181B] dark:text-zinc-400 dark:hover:text-white bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Extend Page</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteBookTarget)}
        title="Delete Book"
        message={
          deleteBookTarget
            ? `Delete "${deleteBookTarget.name}" and its ${deleteBookTarget.pageIds.length === 1
              ? '1 page'
              : `${deleteBookTarget.pageIds.length} pages`
            } from the shelf?`
            : ''
        }
        confirmLabel="Delete Book"
        onConfirm={confirmDeleteBook}
        onCancel={() => setDeleteBookTarget(null)}
      />
    </div>
  );
};
