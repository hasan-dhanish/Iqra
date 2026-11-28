import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import {
  ArrowLeft,
  Bookmark,
  Clock,
  ExternalLink,
  FileText,
  FolderPlus,
  History,
  Home,
  ListVideo,
  Loader2,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Tv,
} from 'lucide-react';

interface SearchResultItem {
  videoId: string;
  title: string;
  channel: string;
  channelId?: string;
  thumbnail: string;
  durationText: string;
  listId?: string;
}

interface KeyMoment {
  id: string;
  seconds: number;
  timeLabel: string;
  note: string;
}

interface Playlist {
  id: string;
  name: string;
  videos: SearchResultItem[];
}

interface HistoryEntry extends SearchResultItem {
  watchedAt: string;
}

const SAVED_VIDEOS_KEY = 'iqra_saved_yt_videos_v1';
const PLAYLISTS_KEY = 'iqra_yt_playlists_v1';
const HISTORY_KEY = 'iqra_yt_history_v1';
const NOTES_KEY = 'iqra_yt_notes_v1';
const MOMENTS_KEY = 'iqra_yt_moments_v1';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function formatSecondsLabel(totalSecs: number): string {
  const safe = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function parseTimestamp(input: string): { seconds: number; label: string } | null {
  const clean = input.trim();
  if (!clean) return null;
  const parts = clean.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  let seconds = 0;
  if (parts.length === 1) seconds = parts[0];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else return null;

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const label =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  return { seconds, label };
}

function parseYouTubeUrl(rawUrl: string): { videoId?: string; listId?: string } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!u.hostname.includes('youtube.com') && !u.hostname.includes('youtu.be')) {
      return null;
    }
    const listId = u.searchParams.get('list') || undefined;
    let videoId = u.searchParams.get('v') || undefined;
    if (!videoId && u.hostname.includes('youtu.be')) {
      videoId = u.pathname.replace(/^\//, '').split('/')[0] || undefined;
    }
    if (!videoId && u.pathname.includes('/embed/')) {
      videoId = u.pathname.split('/embed/')[1]?.split('/')[0] || undefined;
    }
    if (!videoId && u.pathname.includes('/shorts/')) {
      videoId = u.pathname.split('/shorts/')[1]?.split('/')[0] || undefined;
    }
    if (!videoId && !listId) return null;
    return { videoId, listId };
  } catch {
    return null;
  }
}

async function searchYouTubePublic(
  query: string,
  type: 'all' | 'playlist' = 'all'
): Promise<SearchResultItem[]> {
  const res = await fetch(
    `/api/yt-search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`
  );
  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data.items) && data.items.length > 0) {
      return data.items;
    }
  }
  throw new Error('Could not load search results right now. You can paste any YouTube URL directly!');
}

export interface YoutubeActiveVideo {
  videoId: string;
  listId?: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationText?: string;
}

interface YoutubeViewProps {
  initialVideo?: YoutubeActiveVideo | null;
  onVideoChange?: (video: YoutubeActiveVideo | null) => void;
}

export const YoutubeView: React.FC<YoutubeViewProps> = ({
  initialVideo = null,
  onVideoChange,
}) => {
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'playlist'>('all');
  const [viewMode, setViewMode] = useState<'browse' | 'watch'>(() =>
    initialVideo ? 'watch' : 'browse'
  );
  const [browseTab, setBrowseTab] = useState<'results' | 'saved' | 'playlists' | 'history'>('results');

  const [currentVideo, setCurrentVideo] = useState<SearchResultItem | null>(() =>
    initialVideo
      ? {
          videoId: initialVideo.videoId,
          title: initialVideo.title,
          channel: initialVideo.channel,
          thumbnail: initialVideo.thumbnail,
          durationText: initialVideo.durationText ?? '',
        }
      : null
  );
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [embedNonce, setEmbedNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeChannelName, setActiveChannelName] = useState<string | null>(null);

  // Study Companion Tabs in Watch Mode
  const [sideTab, setSideTab] = useState<'notes' | 'moments' | 'upnext'>('notes');
  const [momentTime, setMomentTime] = useState('0:00');
  const [momentNote, setMomentNote] = useState('');
  const [momentTimeLocked, setMomentTimeLocked] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'moment' | 'playlist'; id: string; title: string } | null>(null);
  const momentTimeLockedRef = useRef(false);

  useEffect(() => {
    momentTimeLockedRef.current = momentTimeLocked;
  }, [momentTimeLocked]);

  // Listen to YouTube iframe postMessage events to keep momentTime synced with elapsed video time
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.origin !== 'string' ||
        (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))
      ) {
        return;
      }
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data) as {
          event?: string;
          info?: { currentTime?: number };
        };
        if (
          (data.event === 'infoDelivery' || data.event === 'initialDelivery') &&
          typeof data.info?.currentTime === 'number' &&
          !momentTimeLockedRef.current
        ) {
          setMomentTime(formatSecondsLabel(data.info.currentTime));
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const subscribeToPlayerEvents = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
      '*'
    );
  };

  // Persisted State
  const [savedVideos, setSavedVideos] = useState<SearchResultItem[]>(() =>
    loadJson(SAVED_VIDEOS_KEY, [])
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(() =>
    loadJson(PLAYLISTS_KEY, [])
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    loadJson(HISTORY_KEY, [])
  );
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() =>
    loadJson(NOTES_KEY, {})
  );
  const [momentsMap, setMomentsMap] = useState<Record<string, KeyMoment[]>>(() =>
    loadJson(MOMENTS_KEY, {})
  );

  const recordHistory = (item: SearchResultItem) => {
    const entry: HistoryEntry = {
      ...item,
      watchedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    const next = [entry, ...history.filter((h) => h.videoId !== item.videoId)].slice(0, 50);
    setHistory(next);
    saveJson(HISTORY_KEY, next);
  };

  const playVideo = (item: SearchResultItem, startAt = 0) => {
    setCurrentVideo(item);
    onVideoChange?.(item);
    setSeekSeconds(startAt);
    setEmbedNonce((n) => n + 1);
    setViewMode('watch');
    setShowPlaylistPicker(false);
    recordHistory(item);
  };

  const jumpToTimestamp = (seconds: number) => {
    // Try YouTube iframe postMessage seekTo first; also update startAt fallback
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    } else {
      setSeekSeconds(seconds);
      setEmbedNonce((n) => n + 1);
    }
  };

  const openChannel = async (channelName: string, channelId?: string) => {
    setSearchError('');
    setBrowseTab('results');
    setViewMode('browse');
    setActiveChannelName(channelName);
    setSearching(true);
    try {
      const endpoint = channelId
        ? `/api/yt-search?channelId=${encodeURIComponent(channelId)}`
        : `/api/yt-search?q=${encodeURIComponent(channelName)}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setResults(data.items);
          if (data.channelName) setActiveChannelName(data.channelName);
          return;
        }
      }
      setSearchError(`Could not load videos for ${channelName}.`);
    } catch {
      setSearchError(`Could not load videos for ${channelName}.`);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchOrUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchError('');

    const directUrl = parseYouTubeUrl(trimmed);
    if (directUrl && (directUrl.videoId || directUrl.listId)) {
      playVideo({
        videoId: directUrl.videoId || '',
        listId: directUrl.listId,
        title: directUrl.listId ? 'YouTube Playlist' : 'YouTube Video',
        channel: 'YouTube',
        thumbnail: directUrl.videoId
          ? `https://i.ytimg.com/vi/${directUrl.videoId}/hqdefault.jpg`
          : '',
        durationText: '',
      });
      return;
    }

    setSearching(true);
    setActiveChannelName(null);
    setBrowseTab('results');
    setViewMode('browse');
    try {
      const items = await searchYouTubePublic(trimmed, searchFilter);
      setResults(items);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Could not fetch search results.'
      );
    } finally {
      setSearching(false);
    }
  };

  const toggleSaveVideo = (item: SearchResultItem) => {
    const exists = savedVideos.some((v) => v.videoId === item.videoId);
    const next = exists
      ? savedVideos.filter((v) => v.videoId !== item.videoId)
      : [item, ...savedVideos];
    setSavedVideos(next);
    saveJson(SAVED_VIDEOS_KEY, next);
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl: Playlist = {
      id: `pl_${Date.now().toString(36)}`,
      name: newPlaylistName.trim(),
      videos: currentVideo && showPlaylistPicker ? [currentVideo] : [],
    };
    const next = [pl, ...playlists];
    setPlaylists(next);
    saveJson(PLAYLISTS_KEY, next);
    setNewPlaylistName('');
    setSelectedPlaylistId(pl.id);
  };

  const toggleVideoInPlaylist = (playlistId: string, item: SearchResultItem) => {
    const next = playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const exists = pl.videos.some((v) => v.videoId === item.videoId);
      return {
        ...pl,
        videos: exists
          ? pl.videos.filter((v) => v.videoId !== item.videoId)
          : [item, ...pl.videos],
      };
    });
    setPlaylists(next);
    saveJson(PLAYLISTS_KEY, next);
  };

  const deletePlaylist = (playlistId: string) => {
    const next = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(next);
    saveJson(PLAYLISTS_KEY, next);
    if (selectedPlaylistId === playlistId) setSelectedPlaylistId(null);
  };

  const handleNoteChange = (text: string) => {
    if (!currentVideo) return;
    const next = { ...notesMap, [currentVideo.videoId]: text };
    setNotesMap(next);
    saveJson(NOTES_KEY, next);
  };

  const handleAddMoment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVideo) return;
    const parsed = parseTimestamp(momentTime);
    if (!parsed) return;
    const existing = momentsMap[currentVideo.videoId] ?? [];
    const nextList = [
      ...existing,
      {
        id: `km_${Date.now().toString(36)}`,
        seconds: parsed.seconds,
        timeLabel: parsed.label,
        note: momentNote.trim() || 'Key Moment',
      },
    ].sort((a, b) => a.seconds - b.seconds);
    const next = { ...momentsMap, [currentVideo.videoId]: nextList };
    setMomentsMap(next);
    saveJson(MOMENTS_KEY, next);
    setMomentNote('');
    setMomentTimeLocked(false);
  };

  const deleteMoment = (momentId: string) => {
    if (!currentVideo) return;
    const nextList = (momentsMap[currentVideo.videoId] ?? []).filter(
      (m) => m.id !== momentId
    );
    const next = { ...momentsMap, [currentVideo.videoId]: nextList };
    setMomentsMap(next);
    saveJson(MOMENTS_KEY, next);
  };

  const clearHistory = () => {
    setHistory([]);
    saveJson(HISTORY_KEY, []);
  };

  const currentMoments = currentVideo ? momentsMap[currentVideo.videoId] ?? [] : [];
  const currentNote = currentVideo ? notesMap[currentVideo.videoId] ?? '' : '';
  const isCurrentSaved = currentVideo
    ? savedVideos.some((v) => v.videoId === currentVideo.videoId)
    : false;

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? playlists[0] ?? null,
    [playlists, selectedPlaylistId]
  );

  const displayedBrowseList =
    browseTab === 'saved'
      ? savedVideos
      : browseTab === 'history'
      ? history
      : browseTab === 'playlists'
      ? activePlaylist?.videos ?? []
      : results;

  const embedSrc = currentVideo
    ? currentVideo.listId
      ? currentVideo.videoId
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            currentVideo.videoId
          )}?list=${encodeURIComponent(currentVideo.listId)}&autoplay=1&enablejsapi=1${
            typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
          }${seekSeconds > 0 ? `&start=${seekSeconds}` : ''}&t=${embedNonce}`
        : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
            currentVideo.listId
          )}&autoplay=1&enablejsapi=1${
            typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
          }&t=${embedNonce}`
      : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          currentVideo.videoId
        )}?autoplay=1&enablejsapi=1${
          typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
        }${seekSeconds > 0 ? `&start=${seekSeconds}` : ''}&t=${embedNonce}`
    : '';

  return (
    <div className="space-y-4">
      {/* Top YouTube-Style Browser Bar */}
      <div className="paper-card rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {viewMode === 'watch' && (
            <button
              type="button"
              onClick={() => setViewMode('browse')}
              className="ios-press p-1.5 rounded-xl border border-[#E2E0D8] text-[#52525B] hover:text-[#1C1C1E]"
              title="Back to Browse"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#A43850] text-white flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-[#1C1C1E] hidden sm:inline">
              YouTube
            </span>
          </div>
        </div>

        {/* Centered Search Input + Video/YT Playlist Filter */}
        <form onSubmit={handleSearchOrUrl} className="flex-1 max-w-2xl flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lectures, playlists, or paste YouTube URL..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-full border border-[#E2E0D8] bg-white/70 focus:outline-none focus:border-[#9B5B76]"
            />
          </div>
          <div className="inline-flex items-center rounded-full bg-black/5 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchFilter('all')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                searchFilter === 'all' ? 'bg-[#9B5B76] text-white' : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSearchFilter('playlist')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                searchFilter === 'playlist' ? 'bg-[#9B5B76] text-white' : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              YT Playlists
            </button>
          </div>
          <button
            type="submit"
            disabled={searching}
            className="ios-press px-4 py-2 text-xs font-semibold bg-[#9B5B76] hover:bg-[#874D65] text-white rounded-full inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {/* Browse / Saved / Playlists / History Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-black/5 rounded-full p-1">
          {(
            [
              { id: 'results', label: 'Browse', icon: Home },
              { id: 'saved', label: 'Saved', icon: Bookmark },
              { id: 'playlists', label: 'Playlists', icon: ListVideo },
              { id: 'history', label: 'History', icon: History },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = viewMode === 'browse' && browseTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setBrowseTab(t.id);
                  setViewMode('browse');
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full inline-flex items-center gap-1 transition-colors ${
                  active
                    ? 'bg-[#9B5B76] text-white'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {searchError && (
        <div className="paper-card rounded-xl px-4 py-2.5 text-xs text-[#8B1E1E] flex items-center justify-between gap-2">
          <span>{searchError}</span>
          {query.trim() && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#0A5386] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Open on YouTube <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* WATCH MODE: Player + Side Notes, Key Moments, Playlists & Up Next */}
      {viewMode === 'watch' && currentVideo && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left: Video Player & Metadata */}
          <div className="xl:col-span-8 space-y-3">
            <div className="paper-card rounded-2xl overflow-hidden shadow-lg">
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  ref={iframeRef}
                  src={embedSrc}
                  title={currentVideo.title}
                  onLoad={subscribeToPlayerEvents}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-[#1C1C1E] line-clamp-2">
                    {currentVideo.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => openChannel(currentVideo.channel, currentVideo.channelId)}
                    className="text-xs font-semibold text-[#9B5B76] hover:underline mt-0.5 text-left"
                  >
                    {currentVideo.channel}
                  </button>
                </div>

                <div className="relative flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSaveVideo(currentVideo)}
                    className={`ios-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isCurrentSaved
                        ? 'bg-[#9B5B76] text-white border-[#9B5B76]'
                        : 'border-[#E2E0D8] text-[#52525B] hover:text-[#1C1C1E]'
                    }`}
                  >
                    <Bookmark
                      className="w-3.5 h-3.5"
                      fill={isCurrentSaved ? 'currentColor' : 'none'}
                    />
                    {isCurrentSaved ? 'Saved' : 'Save'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPlaylistPicker((v) => !v)}
                    className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E0D8] text-xs font-semibold text-[#52525B] hover:text-[#1C1C1E]"
                  >
                    <ListVideo className="w-3.5 h-3.5" />
                    Playlist
                  </button>

                  <a
                    href={`https://www.youtube.com/watch?v=${currentVideo.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E2E0D8] text-xs font-semibold text-[#52525B] hover:text-[#1C1C1E]"
                  >
                    YouTube <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Add to Playlist Popover */}
                  {showPlaylistPicker && (
                    <div className="absolute right-0 bottom-11 z-40 w-64 spidey-chat-card rounded-2xl p-3 shadow-2xl space-y-2.5">
                      <div className="text-xs font-bold text-[#1C1C1E]">Save to Playlist</div>
                      {playlists.length > 0 && (
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {playlists.map((pl) => {
                            const inPl = pl.videos.some(
                              (v) => v.videoId === currentVideo.videoId
                            );
                            return (
                              <label
                                key={pl.id}
                                className="flex items-center gap-2 text-xs text-[#1C1C1E] cursor-pointer p-1 rounded-lg hover:bg-black/5"
                              >
                                <input
                                  type="checkbox"
                                  checked={inPl}
                                  onChange={() =>
                                    toggleVideoInPlaylist(pl.id, currentVideo)
                                  }
                                  className="accent-[#9B5B76]"
                                />
                                <span className="truncate">{pl.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <form onSubmit={handleCreatePlaylist} className="flex gap-1.5">
                        <input
                          type="text"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="New playlist..."
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E0D8] bg-white/70"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 text-xs font-semibold bg-[#9B5B76] text-white rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Study Companion (Notes / Key Moments / Up Next) */}
          <div className="xl:col-span-4 paper-card rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/10 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setSideTab('notes')}
                className={`py-1.5 text-[11px] font-semibold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${
                  sideTab === 'notes'
                    ? 'bg-[#9B5B76] text-white shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
                }`}
              >
                <FileText className="w-3 h-3" /> Notes
              </button>
              <button
                type="button"
                onClick={() => setSideTab('moments')}
                className={`py-1.5 text-[11px] font-semibold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${
                  sideTab === 'moments'
                    ? 'bg-[#9B5B76] text-white shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3 h-3" /> Moments
              </button>
              <button
                type="button"
                onClick={() => setSideTab('upnext')}
                className={`py-1.5 text-[11px] font-semibold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${
                  sideTab === 'upnext'
                    ? 'bg-[#9B5B76] text-white shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
                }`}
              >
                <ListVideo className="w-3 h-3" /> Up Next
              </button>
            </div>

            {/* Side Tab 1: Per-Video Notes */}
            {sideTab === 'notes' && (
              <div className="space-y-2">
                <div className="text-[11px] text-[#8E8E93]">
                  Auto-saved notes for this video
                </div>
                <textarea
                  rows={14}
                  value={currentNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Write formulas, key points, or lecture summary here..."
                  className="w-full p-3 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#9B5B76] leading-relaxed"
                />
              </div>
            )}

            {/* Side Tab 2: Key Moments */}
            {sideTab === 'moments' && (
              <div className="space-y-3">
                <form onSubmit={handleAddMoment} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={momentTime}
                      onChange={(e) => {
                        setMomentTimeLocked(true);
                        setMomentTime(e.target.value);
                      }}
                      placeholder="12:45"
                      title={
                        momentTimeLocked
                          ? 'Timestamp locked at your key moment'
                          : 'Auto-synced with video elapsed time'
                      }
                      className="w-20 px-2.5 py-1.5 text-xs font-mono-num rounded-xl border border-[#E2E0D8] bg-white/60"
                    />
                    <input
                      type="text"
                      value={momentNote}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMomentNote(val);
                        setMomentTimeLocked(val.length > 0);
                      }}
                      placeholder="What happens at this moment?"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                    />
                  </div>
                  <button
                    type="submit"
                    className="ios-press w-full py-1.5 text-xs font-semibold bg-[#9B5B76] text-white rounded-xl inline-flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save Key Moment
                  </button>
                </form>

                {currentMoments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8E8E93]">
                    No key moments saved yet. Enter a timestamp like 12:45 above!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                    {currentMoments.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl border border-[#E2E0D8]/70 bg-white/40"
                      >
                        <button
                          type="button"
                          onClick={() => jumpToTimestamp(m.seconds)}
                          className="flex items-center gap-2 text-left min-w-0 flex-1"
                          title="Jump to timestamp"
                        >
                          <span className="px-2 py-0.5 rounded-md bg-[#9B5B76]/15 text-[#9B5B76] font-mono-num text-[11px] font-bold shrink-0">
                            {m.timeLabel}
                          </span>
                          <span className="text-xs text-[#1C1C1E] truncate">{m.note}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ type: 'moment', id: m.id, title: 'Key Moment' })}
                          className="text-[#8E8E93] hover:text-red-600 p-1 transition-colors"
                          title="Delete moment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Side Tab 3: Up Next & Playlists */}
            {sideTab === 'upnext' && (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {playlists.length > 0 && (
                  <div className="space-y-1.5 pb-2 border-b border-[#E2E0D8]">
                    <div className="text-[11px] font-bold text-[#1C1C1E] px-1 flex items-center justify-between">
                      <span>Saved Playlists</span>
                      <span className="text-[10px] text-[#8E8E93]">{playlists.length}</span>
                    </div>
                    {playlists.map((pl) => (
                      <div key={pl.id} className="rounded-xl bg-black/[0.03] p-2 space-y-1">
                        <div className="text-[11px] font-bold text-[#9B5B76] flex items-center justify-between">
                          <span className="truncate">{pl.name}</span>
                          <span className="text-[10px] text-[#8E8E93] shrink-0">
                            {pl.videos.length}
                          </span>
                        </div>
                        {pl.videos.map((v) => (
                          <button
                            key={v.videoId}
                            type="button"
                            onClick={() => playVideo(v)}
                            className={`w-full flex items-center gap-2 p-1 rounded-lg text-left transition-colors ${
                              currentVideo.videoId === v.videoId
                                ? 'bg-[#9B5B76]/15 text-[#9B5B76]'
                                : 'hover:bg-black/5'
                            }`}
                          >
                            <img
                              src={v.thumbnail}
                              alt=""
                              className="w-12 h-8 rounded object-cover shrink-0"
                            />
                            <span className="text-[11px] font-semibold text-[#1C1C1E] truncate">
                              {v.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {results.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#8E8E93]">
                    Search for videos to see Up Next results here.
                  </div>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.videoId}
                      type="button"
                      onClick={() => playVideo(item)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-colors ${
                        currentVideo.videoId === item.videoId
                          ? 'border-[#9B5B76] bg-[#9B5B76]/10'
                          : 'border-transparent hover:bg-black/5'
                      }`}
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-24 aspect-video object-cover rounded-lg shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1C1C1E] line-clamp-2 leading-snug">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-[#8E8E93] truncate mt-0.5">
                          {item.channel}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BROWSE / SAVED / PLAYLISTS / HISTORY MODE */}
      {viewMode === 'browse' && (
        <div className="space-y-4">
          {activeChannelName && browseTab === 'results' && (
            <div className="paper-card rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-[#1C1C1E]">
                Channel: <span className="text-[#9B5B76]">{activeChannelName}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveChannelName(null)}
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1C1C1E]"
              >
                Clear channel filter
              </button>
            </div>
          )}

          {/* Playlists Bar */}
          {browseTab === 'playlists' && (
            <div className="paper-card rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistId(pl.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                          activePlaylist?.id === pl.id
                            ? 'bg-[#9B5B76] text-white border-[#9B5B76]'
                            : 'border-[#E2E0D8] text-[#52525B]'
                        }`}
                      >
                        {pl.name} ({pl.videos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ type: 'playlist', id: pl.id, title: pl.name })}
                        className="p-1 text-[#8E8E93] hover:text-red-600 transition-colors"
                        title="Delete playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreatePlaylist} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="New playlist name..."
                    className="px-3 py-1.5 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                  <button
                    type="submit"
                    className="ios-press px-3 py-1.5 text-xs font-semibold bg-[#9B5B76] text-white rounded-xl inline-flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Create
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* History Header */}
          {browseTab === 'history' && history.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Watch History
              </button>
            </div>
          )}

          {displayedBrowseList.length === 0 ? (
            <div className="paper-card rounded-2xl p-12 text-center space-y-2">
              <Tv className="w-8 h-8 text-[#9B5B76]/60 mx-auto" />
              <div className="text-sm font-bold text-[#1C1C1E]">
                {browseTab === 'saved'
                  ? 'No saved videos yet'
                  : browseTab === 'playlists'
                  ? 'No videos in this playlist yet'
                  : browseTab === 'history'
                  ? 'Your watch history is empty'
                  : 'Search YouTube to start studying'}
              </div>
              <p className="text-xs text-[#8E8E93]">
                {browseTab === 'results'
                  ? 'Type any lecture, topic, or channel name above—or paste a YouTube link.'
                  : 'Videos you watch, save, or organize will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedBrowseList.map((item) => {
                const isSaved = savedVideos.some((v) => v.videoId === item.videoId);
                const histItem = item as HistoryEntry;
                return (
                  <div
                    key={`${browseTab}-${item.listId || ''}-${item.videoId}`}
                    className="paper-card rounded-2xl overflow-hidden flex flex-col justify-between group"
                  >
                    <button
                      type="button"
                      onClick={() => playVideo(item)}
                      className="text-left"
                    >
                      <div className="relative aspect-video bg-black/15 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="w-11 h-11 rounded-full bg-[#9B5B76] text-white flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 ml-0.5" />
                          </span>
                        </div>
                        {(item.listId || item.durationText) && (
                          <span
                            className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-white text-[10px] font-mono-num font-semibold ${
                              item.listId ? 'bg-[#9B5B76]' : 'bg-black/80'
                            }`}
                          >
                            {item.listId ? `PLAYLIST · ${item.durationText || ''}` : item.durationText}
                          </span>
                        )}
                      </div>
                      <div className="p-3 pb-1 space-y-1">
                        <div className="text-xs font-bold text-[#1C1C1E] line-clamp-2 leading-snug">
                          {item.title}
                        </div>
                      </div>
                    </button>

                    <div className="px-3 pb-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openChannel(item.channel, item.channelId)}
                        className="text-[11px] text-[#8E8E93] hover:text-[#9B5B76] hover:underline truncate text-left"
                      >
                        {item.channel}
                      </button>
                      {browseTab === 'history' && histItem.watchedAt && (
                        <span className="text-[10px] text-[#8E8E93] inline-flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {histItem.watchedAt}
                        </span>
                      )}
                    </div>

                    <div className="px-3 pb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => playVideo(item)}
                        className="text-[11px] font-semibold text-[#9B5B76] hover:underline"
                      >
                        Watch now
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          browseTab === 'playlists' && activePlaylist
                            ? toggleVideoInPlaylist(activePlaylist.id, item)
                            : toggleSaveVideo(item)
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved ? 'text-[#9B5B76]' : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                        }`}
                        title={
                          browseTab === 'playlists'
                            ? 'Remove from playlist'
                            : isSaved
                            ? 'Remove from Saved'
                            : 'Save video'
                        }
                      >
                        {browseTab === 'saved' || browseTab === 'playlists' ? (
                          <Trash2 className="w-3.5 h-3.5" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title={deleteConfirm?.type === 'playlist' ? 'Delete Playlist' : 'Delete Moment'}
        message="Are you sure you want to Delete ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => {
          if (deleteConfirm) {
            if (deleteConfirm.type === 'moment') deleteMoment(deleteConfirm.id);
            else if (deleteConfirm.type === 'playlist') deletePlaylist(deleteConfirm.id);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
