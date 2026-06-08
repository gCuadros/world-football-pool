import { Reveal } from "@/components/ui/reveal";
import { Newspaper, ExternalLink } from "lucide-react";

import { getNews, type NewsItem } from "@/lib/news";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Noticias · Quiniela Mundial 2026" };

export default function NoticiasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Newspaper className="text-primary size-5" />
        <h1 className="text-xl font-bold">Noticias</h1>
        <span className="text-muted-foreground text-sm">Fútbol y Mundial 2026</span>
      </div>

      <Reveal fallback={<NewsSkeleton />}>
        <NewsList />
      </Reveal>
    </div>
  );
}

async function NewsList() {
  const news = await getNews();

  if (news.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No hay noticias disponibles ahora mismo. Vuelve a intentarlo en unos minutos.
      </div>
    );
  }

  const [lead, ...rest] = news;

  return (
    <div className="space-y-6">
      {/* Destacada */}
      <NewsCard item={lead} featured />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((item) => (
          <NewsCard key={item.link} item={item} />
        ))}
      </div>
    </div>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}

function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`border-border bg-card group flex overflow-hidden rounded-2xl border transition-colors hover:border-primary/40 ${
        featured ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          loading="lazy"
          className={`bg-muted object-cover ${
            featured ? "h-48 w-full sm:h-auto sm:w-2/5" : "h-40 w-full"
          }`}
        />
      ) : (
        <div
          className={`bg-secondary flex items-center justify-center ${
            featured ? "h-48 w-full sm:h-auto sm:w-2/5" : "h-40 w-full"
          }`}
        >
          <Newspaper className="text-primary/40 size-10" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase">
            {item.source}
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {formatDate(item.isoDate)}
          </span>
        </div>
        <h2
          className={`group-hover:text-primary font-semibold transition-colors ${
            featured ? "text-lg sm:text-xl" : "text-sm"
          }`}
        >
          {item.title}
        </h2>
        <span className="text-muted-foreground mt-auto flex items-center gap-1 text-xs">
          Leer en {item.source}
          <ExternalLink className="size-3" />
        </span>
      </div>
    </a>
  );
}

function NewsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
