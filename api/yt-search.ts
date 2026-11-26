import type { IncomingMessage, ServerResponse } from 'node:http';

interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  channelId?: string;
  thumbnail: string;
  durationText: string;
}

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

function mapVideoRenderer(vr: any, fallbackChannel?: string, fallbackChannelId?: string): VideoResult | null {
  if (!vr?.videoId) return null;
  const ownerRun = vr.ownerText?.runs?.[0] ?? vr.shortBylineText?.runs?.[0];
  return {
    videoId: vr.videoId,
    title: vr.title?.runs?.[0]?.text ?? vr.title?.simpleText ?? 'Untitled Video',
    channel: ownerRun?.text ?? fallbackChannel ?? 'YouTube',
    channelId:
      ownerRun?.navigationEndpoint?.browseEndpoint?.browseId ?? fallbackChannelId,
    thumbnail:
      vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ??
      `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
    durationText: vr.lengthText?.simpleText ?? 'LIVE',
  };
}

function extractSearchVideos(html: string): VideoResult[] {
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (!match) return [];
  const data = JSON.parse(match[1]);
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];

  const results: VideoResult[] = [];
  for (const section of sections) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const mapped = mapVideoRenderer(item?.videoRenderer);
      if (mapped) results.push(mapped);
      if (results.length >= 16) return results;
    }
  }
  return results;
}

function extractChannelVideos(html: string, channelId: string): { channelName: string; items: VideoResult[] } {
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (!match) return { channelName: 'Channel', items: [] };
  const data = JSON.parse(match[1]);
  const channelName =
    data?.metadata?.channelMetadataRenderer?.title ??
    data?.header?.c4TabbedHeaderRenderer?.title ??
    'Channel';

  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  const results: VideoResult[] = [];

  for (const tab of tabs) {
    const gridItems = tab?.tabRenderer?.content?.richGridRenderer?.contents ?? [];
    for (const entry of gridItems) {
      const content = entry?.richItemRenderer?.content;
      const mapped = mapVideoRenderer(content?.videoRenderer, channelName, channelId);
      if (mapped) {
        results.push(mapped);
      } else if (content?.lockupViewModel?.contentId) {
        const lvm = content.lockupViewModel;
        const vid = lvm.contentId as string;
        results.push({
          videoId: vid,
          title: lvm.metadata?.lockupMetadataViewModel?.title?.content ?? 'Untitled Video',
          channel: channelName,
          channelId,
          thumbnail:
            lvm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ??
            `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          durationText:
            lvm.contentImage?.thumbnailViewModel?.overlays?.[0]
              ?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel
              ?.text ?? 'LIVE',
        });
      }
      if (results.length >= 16) return { channelName, items: results };
    }
  }
  return { channelName, items: results };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const q = url.searchParams.get('q')?.trim() || '';
  const channelId = url.searchParams.get('channelId')?.trim() || '';

  if (!q && !channelId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ items: [], error: 'Missing query or channelId' }));
    return;
  }

  try {
    if (channelId) {
      const ytRes = await fetch(
        `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/videos`,
        { headers: YT_HEADERS }
      );
      const html = await ytRes.text();
      const { channelName, items } = extractChannelVideos(html, channelId);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ channelName, items }));
      return;
    }

    const ytRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      { headers: YT_HEADERS }
    );
    const html = await ytRes.text();
    const items = extractSearchVideos(html);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ items }));
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ items: [], error: 'YouTube fetch failed' }));
  }
}
