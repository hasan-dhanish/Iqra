// Google Drive API v3 + Google Identity Services (GIS) helper for Iqra Desk

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

const TOKEN_STORAGE_KEY = 'iqra_gdrive_token_v1';
const CLIENT_ID_STORAGE_KEY = 'iqra_gdrive_client_id_v1';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const FOLDER_NAME = 'Iqra Desk';

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: {
              access_token?: string;
              expires_in?: number;
              error?: string;
            }) => void;
          }) => {
            requestAccessToken: (opts?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export function getGoogleClientId(): string {
  const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  if (envId) return envId;
  try {
    return localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function saveGoogleClientId(clientId: string): void {
  try {
    const trimmed = clientId.trim();
    if (trimmed) localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
    else localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getCachedDriveToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (parsed.accessToken && Date.now() < parsed.expiresAt - 30_000) {
      return parsed.accessToken;
    }
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function clearDriveToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function requestDriveToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('Google Sign-In script is still loading. Please try again in a second.'));
      return;
    }
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Google Drive authorization was cancelled.'));
          return;
        }
        const expiresInMs = (resp.expires_in ?? 3600) * 1000;
        try {
          sessionStorage.setItem(
            TOKEN_STORAGE_KEY,
            JSON.stringify({
              accessToken: resp.access_token,
              expiresAt: Date.now() + expiresInMs,
            } satisfies StoredToken)
          );
        } catch {
          // ignore
        }
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

async function driveFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) clearDriveToken();
    const text = await res.text();
    throw new Error(`Drive API error (${res.status}): ${text.slice(0, 180)}`);
  }
  return (await res.json()) as T;
}

export async function findOrCreateIqraFolder(token: string): Promise<string> {
  const q = encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const search = await driveFetch<{ files: { id: string }[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`,
    token
  );
  if (search.files.length > 0) {
    return search.files[0].id;
  }
  const created = await driveFetch<{ id: string }>(
    'https://www.googleapis.com/drive/v3/files',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  return created.id;
}

export async function listDriveFiles(token: string, folderId: string): Promise<DriveFileItem[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent(
    'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)'
  );
  const data = await driveFetch<{ files: DriveFileItem[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=100`,
    token
  );
  return data.files ?? [];
}

function getTargetGoogleMime(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (
    lower.endsWith('.docx') ||
    lower.endsWith('.doc') ||
    file.type.includes('wordprocessingml') ||
    file.type === 'application/msword'
  ) {
    return 'application/vnd.google-apps.document';
  }
  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv') ||
    file.type.includes('spreadsheetml') ||
    file.type === 'text/csv'
  ) {
    return 'application/vnd.google-apps.spreadsheet';
  }
  if (
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt') ||
    file.type.includes('presentationml')
  ) {
    return 'application/vnd.google-apps.presentation';
  }
  return null;
}

export async function uploadToDrive(
  token: string,
  folderId: string,
  file: File,
  convertEditable = true
): Promise<DriveFileItem> {
  const targetGoogleMime = convertEditable ? getTargetGoogleMime(file) : null;
  const metadata: Record<string, unknown> = {
    name: targetGoogleMime ? file.name.replace(/\.[^.]+$/, '') : file.name,
    parents: [folderId],
  };
  if (targetGoogleMime) {
    metadata.mimeType = targetGoogleMime;
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 180)}`);
  }
  return (await res.json()) as DriveFileItem;
}

export async function createBlankGoogleFile(
  token: string,
  folderId: string,
  name: string,
  kind: 'doc' | 'sheet'
): Promise<DriveFileItem> {
  const mimeType =
    kind === 'doc'
      ? 'application/vnd.google-apps.document'
      : 'application/vnd.google-apps.spreadsheet';
  return driveFetch<DriveFileItem>(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,size,modifiedTime,webViewLink',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim() || (kind === 'doc' ? 'Untitled Doc' : 'Untitled Sheet'),
        mimeType,
        parents: [folderId],
      }),
    }
  );
}

export async function trashDriveFile(token: string, fileId: string): Promise<void> {
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
}

export async function renameDriveFile(
  token: string,
  fileId: string,
  newName: string
): Promise<DriveFileItem> {
  return driveFetch<DriveFileItem>(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,modifiedTime,webViewLink`,
    token,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    }
  );
}

export function getDriveEmbedUrl(file: DriveFileItem): string {
  switch (file.mimeType) {
    case 'application/vnd.google-apps.document':
      return `https://docs.google.com/document/d/${file.id}/edit?embedded=true`;
    case 'application/vnd.google-apps.spreadsheet':
      return `https://docs.google.com/spreadsheets/d/${file.id}/edit?embedded=true`;
    case 'application/vnd.google-apps.presentation':
      return `https://docs.google.com/presentation/d/${file.id}/edit?embedded=true`;
    default:
      return `https://drive.google.com/file/d/${file.id}/preview`;
  }
}

export function isEditableGoogleFile(mimeType: string): boolean {
  return (
    mimeType === 'application/vnd.google-apps.document' ||
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType === 'application/vnd.google-apps.presentation'
  );
}

export interface DriveSavedNoteResource {
  kind: 'Bookmark' | 'Video' | 'Snippet';
  title: string;
  url?: string;
  content?: string;
  tags?: string[];
}

export async function uploadJsonResourceToDrive(
  token: string,
  folderId: string,
  resource: DriveSavedNoteResource
): Promise<DriveFileItem> {
  const safeName = resource.title.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'resource';
  const file = new File(
    [JSON.stringify(resource, null, 2)],
    `${safeName}.iqra.json`,
    { type: 'application/json' }
  );
  return uploadToDrive(token, folderId, file, false);
}

export async function fetchDriveFileJson<T>(token: string, fileId: string): Promise<T> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to read file (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function createDriveSubfolder(
  token: string,
  parentFolderId: string,
  name: string
): Promise<DriveFileItem> {
  return driveFetch<DriveFileItem>(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime,webViewLink',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    }
  );
}

export async function moveDriveFileToFolder(
  token: string,
  fileId: string,
  targetFolderId: string,
  currentParentId: string
): Promise<DriveFileItem> {
  const params = new URLSearchParams({
    addParents: targetFolderId,
    removeParents: currentParentId,
    fields: 'id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink',
  });
  return driveFetch<DriveFileItem>(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
    token,
    { method: 'PATCH' }
  );
}
