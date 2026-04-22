'use client';

export function VideoPlayer({ provider, url }: { provider: string; url: string }) {
  if (!url) return <div className="grid aspect-video w-full place-items-center rounded-xl bg-white/5 text-white/40">No video</div>;

  const src = toEmbed(provider, url);
  if (provider === 'iframe') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
        <div dangerouslySetInnerHTML={{ __html: sanitize(url) }} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <iframe src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
    </div>
  );
}

function toEmbed(provider: string, url: string): string {
  try {
    if (provider === 'youtube') {
      const u = new URL(url);
      const id = u.searchParams.get('v') || u.pathname.split('/').pop() || '';
      return `https://www.youtube.com/embed/${id}`;
    }
    if (provider === 'vimeo') {
      const id = url.split('/').filter(Boolean).pop() || '';
      return `https://player.vimeo.com/video/${id}`;
    }
    if (provider === 'gumlet') {
      return url.includes('/embed/') ? url : url.replace('/watch/', '/embed/');
    }
  } catch {}
  return url;
}

function sanitize(html: string) {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}
