import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

function ytSearchDevPlugin(): Plugin {
  return {
    name: 'yt-search-dev',
    configureServer(server) {
      server.middlewares.use('/api/yt-search', async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost');
        const q = url.searchParams.get('q')?.trim() || '';
        const channelId = url.searchParams.get('channelId')?.trim() || '';
        const searchType = url.searchParams.get('type')?.trim() || 'all';
        if (!q && !channelId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ items: [] }));
          return;
        }
        try {
          if (channelId) {
            const ytRes = await fetch(
              `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/videos`,
              { headers: YT_HEADERS }
            );
            const html = await ytRes.text();
            const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
            let channelName = 'Channel';
            const items: Array<{
              videoId: string;
              title: string;
              channel: string;
              channelId?: string;
              thumbnail: string;
              durationText: string;
            }> = [];
            if (match) {
              const data = JSON.parse(match[1]);
              channelName =
                data?.metadata?.channelMetadataRenderer?.title ??
                data?.header?.c4TabbedHeaderRenderer?.title ??
                'Channel';
              const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
              for (const tab of tabs) {
                for (const entry of tab?.tabRenderer?.content?.richGridRenderer?.contents ?? []) {
                  const content = entry?.richItemRenderer?.content;
                  const vr = content?.videoRenderer;
                  if (vr?.videoId) {
                    items.push({
                      videoId: vr.videoId,
                      title: vr.title?.runs?.[0]?.text ?? vr.title?.simpleText ?? 'Untitled Video',
                      channel: channelName,
                      channelId,
                      thumbnail:
                        vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ??
                        `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                      durationText: vr.lengthText?.simpleText ?? 'LIVE',
                    });
                  } else if (content?.lockupViewModel?.contentId) {
                    const lvm = content.lockupViewModel;
                    const vid = lvm.contentId as string;
                    items.push({
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
                  if (items.length >= 16) break;
                }
                if (items.length >= 16) break;
              }
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ channelName, items }));
            return;
          }

          const searchUrl =
            searchType === 'playlist'
              ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAw%253D%253D`
              : `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
          const ytRes = await fetch(searchUrl, { headers: YT_HEADERS });
          const html = await ytRes.text();
          const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
          const items: Array<{
            videoId: string;
            listId?: string;
            title: string;
            channel: string;
            channelId?: string;
            thumbnail: string;
            durationText: string;
          }> = [];
          if (match) {
            const data = JSON.parse(match[1]);
            const sections =
              data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
                ?.sectionListRenderer?.contents ?? [];
            for (const section of sections) {
              for (const entry of section?.itemSectionRenderer?.contents ?? []) {
                const vr = entry?.videoRenderer;
                const pr = entry?.playlistRenderer;
                const lvm = entry?.lockupViewModel;

                if (vr?.videoId && searchType !== 'playlist') {
                  const ownerRun = vr.ownerText?.runs?.[0];
                  items.push({
                    videoId: vr.videoId,
                    title: vr.title?.runs?.[0]?.text ?? 'Untitled Video',
                    channel: ownerRun?.text ?? 'YouTube',
                    channelId: ownerRun?.navigationEndpoint?.browseEndpoint?.browseId,
                    thumbnail:
                      vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ??
                      `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                    durationText: vr.lengthText?.simpleText ?? 'LIVE',
                  });
                } else if (pr?.playlistId) {
                  const firstVid = pr.videos?.[0]?.childVideoRenderer?.videoId || '';
                  const ownerRun = pr.shortBylineText?.runs?.[0] ?? pr.longBylineText?.runs?.[0];
                  items.push({
                    videoId: firstVid,
                    listId: pr.playlistId,
                    title: pr.title?.simpleText ?? pr.title?.runs?.[0]?.text ?? 'YouTube Playlist',
                    channel: ownerRun?.text ?? 'YouTube Playlist',
                    channelId: ownerRun?.navigationEndpoint?.browseEndpoint?.browseId,
                    thumbnail:
                      pr.thumbnails?.[0]?.thumbnails?.slice(-1)[0]?.url ??
                      (firstVid ? `https://i.ytimg.com/vi/${firstVid}/hqdefault.jpg` : ''),
                    durationText: pr.videoCount ? `${pr.videoCount} videos` : 'PLAYLIST',
                  });
                } else if (lvm?.contentId && lvm?.contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST') {
                  const thumbUrl =
                    lvm.contentImage?.collectionThumbnailViewModel?.primaryThumbnail
                      ?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ??
                    lvm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ??
                    '';
                  const badgeText =
                    lvm.contentImage?.collectionThumbnailViewModel?.primaryThumbnail
                      ?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayBadgeViewModel
                      ?.thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text ?? 'PLAYLIST';
                  const metaRows = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows ?? [];
                  const channelText =
                    metaRows?.[0]?.metadataParts?.[0]?.text?.content ?? 'YouTube Playlist';
                  items.push({
                    videoId: '',
                    listId: lvm.contentId,
                    title: lvm.metadata?.lockupMetadataViewModel?.title?.content ?? 'YouTube Playlist',
                    channel: channelText,
                    thumbnail: thumbUrl,
                    durationText: badgeText,
                  });
                }
                if (items.length >= 36) break;
              }
              if (items.length >= 36) break;
            }
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ items }));
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ items: [] }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ytSearchDevPlugin()],
});
