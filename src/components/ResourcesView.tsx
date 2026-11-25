import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Code2,
  ExternalLink,
  FileText,
  Library,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import { useLdoi } from '../context/LdoiContext';
import type { OwnerScope, ResourceKind } from '../types';

const RESOURCE_KINDS: ResourceKind[] = ['Bookmark', 'PDF', 'Video', 'Snippet'];

export const ResourcesView: React.FC = () => {
  const { projects, resources, documents, addResource, deleteResource, deleteDocument } = useLdoi();

  const [kindFilter, setKindFilter] = useState<'All' | ResourceKind>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [kind, setKind] = useState<ResourceKind>('Bookmark');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [owner, setOwner] = useState<OwnerScope>('Both');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addResource({
      projectId: projectId || undefined,
      kind,
      title: title.trim(),
      url: url.trim(),
      content: content.trim(),
      tags: tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      owner,
    });
    setTitle('');
    setUrl('');
    setContent('');
    setTagsRaw('');
    setShowAddForm(false);
  };

  const filteredResources = useMemo(
    () =>
      resources.filter((r) => {
        if (kindFilter !== 'All' && r.kind !== kindFilter) return false;
        if (subjectFilter !== 'all' && r.projectId !== subjectFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      }),
    [resources, kindFilter, subjectFilter, search]
  );

  const kindIcon = (k: ResourceKind) => {
    switch (k) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-[#8B1E1E]" />;
      case 'Video':
        return <Video className="w-4 h-4 text-[#0A5386]" />;
      case 'Snippet':
        return <Code2 className="w-4 h-4 text-[#1B5E5A]" />;
      default:
        return <Bookmark className="w-4 h-4 text-[#5B3A70]" />;
    }
  };

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
            Bookmarks, PDFs, lecture videos, and code snippets shared by Sajitha &amp; Dhani
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#5B3A70] hover:bg-[#6D4785] text-white rounded-xl shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Resource
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8]"
        >
          <div className="text-sm font-bold text-[#1C1C1E]">Save Study Resource</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ResourceKind)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            >
              {RESOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            >
              <option value="">General / All Subjects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value as OwnerScope)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            >
              <option value="Both">Shared (Both)</option>
              <option value="Sajitha">Sajitha</option>
              <option value="Dhani">Dhani</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link / Google Drive / YouTube / PDF URL"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            />
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="Tags (comma-separated, e.g. graphs, formulas)"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
            />
          </div>

          <textarea
            rows={kind === 'Snippet' ? 4 : 2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              kind === 'Snippet'
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
              className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#5B3A70] text-white rounded-xl"
            >
              Save Resource
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...RESOURCE_KINDS] as const).map((k) => (
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

        <div className="flex flex-wrap gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-[#E2E0D8] bg-white/70"
          >
            <option value="all">All Subjects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/70 border border-[#E2E0D8] rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Resource Cards */}
      {filteredResources.length === 0 && documents.length === 0 ? (
        <div className="paper-card rounded-2xl p-10 text-center text-xs text-[#8E8E93]">
          No resources saved yet. Add bookmarks, Drive PDFs, YouTube lectures, or code snippets.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((r) => {
            const subj = projects.find((p) => p.id === r.projectId);
            return (
              <div key={r.id} className="paper-card rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {kindIcon(r.kind)}
                      <span className="text-xs font-bold text-[#1C1C1E] truncate">{r.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteResource(r.id)}
                      className="text-[#8E8E93] hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {r.content && (
                    <pre
                      className={`text-[11px] whitespace-pre-wrap break-words rounded-xl p-2.5 bg-black/5 ${
                        r.kind === 'Snippet' ? 'font-mono text-[#1C1C1E]' : 'text-[#52525B]'
                      }`}
                    >
                      {r.content}
                    </pre>
                  )}

                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map((t) => (
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
                  <span className="text-[#8E8E93] truncate">
                    {subj ? subj.title : 'General'} · {r.owner}
                  </span>
                  {r.url && (
                    <a
                      href={r.url}
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
          })}

          {documents.map((d) => (
            <div key={d.id} className="paper-card rounded-2xl p-4 space-y-2 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#8B1E1E]" />
                  <span className="text-xs font-bold text-[#1C1C1E] truncate">{d.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDocument(d.id)}
                  className="text-[#8E8E93] hover:text-red-600 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E2E0D8]/60 text-[11px]">
                <span className="text-[#8E8E93]">{d.docType}</span>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0A5386] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Download <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
