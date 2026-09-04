import { Link, useLocation } from 'wouter';
import { ArrowUpRight, CalendarDays, ChevronRight, CircleDot, Search, Trophy } from 'lucide-react';
import type { Match, Player, Tournament } from '@workspace/api-client-react';
import { useHealthCheck } from '@workspace/api-client-react';

export const formatDate = (date: string, format: 'time' | 'date' | 'full' = 'full'): string => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  if (format === 'time') return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (format === 'date') return value.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return value.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + formatDate(date, 'time');
};

export const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

export function Navigation() {
  const [location] = useLocation();
  const health = useHealthCheck();
  const navItems = [
    { href: '/', label: 'Match center', icon: CircleDot },
    { href: '/search', label: 'Search', icon: Search },
  ];
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-xl md:inset-y-0 md:right-auto md:w-[248px] md:border-r md:border-t-0">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2 md:block md:max-w-none md:px-5 md:py-7">
        <Link href="/" className="hidden items-center gap-3 px-2 md:flex" data-testid="link-brand">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/.18)]">
            <span className="text-lg font-extrabold italic">S</span>
          </span>
          <span className="font-extrabold tracking-[-.04em] text-sidebar-foreground">Sport<span className="text-primary">Stats</span></span>
        </Link>
        <div className="mt-12 hidden px-2 mono-label text-sidebar-foreground/40 md:block">Your daily ritual</div>
        <nav className="flex w-full items-center justify-around md:mt-3 md:block">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? location === '/' : location.startsWith(href);
            return (
              <Link href={href} key={href} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 md:mb-1 ${active ? 'bg-primary text-primary-foreground shadow-[0_8px_22px_hsl(var(--primary)/.12)]' : 'text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}>
                <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                <span className="hidden md:inline">{label}</span>
                {active && <ChevronRight size={15} className="ml-auto hidden md:inline" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-12 hidden rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4 md:block">
          <div className="flex items-center gap-2 mono-label text-primary"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-destructive' : 'animate-pulse bg-accent'}`} /> Live pulse</div>
          <p className="mt-2 text-xs leading-5 text-sidebar-foreground/60">Scores refresh as the action unfolds. No noise, just the point.</p>
        </div>
      </div>
    </aside>
  );
}

export function PageFrame({ children, eyebrow, title, action }: { children: React.ReactNode; eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="sport-shell min-h-[100dvh] pb-24 md:pl-[248px] md:pb-0">
      <main className="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <header className="mb-8 flex items-end justify-between gap-5 md:mb-10">
          <div className="animate-rise-in">
            {eyebrow && <p className="mono-label mb-2 text-primary">{eyebrow}</p>}
            <h1 className="text-3xl font-extrabold tracking-[-.06em] text-foreground sm:text-4xl">{title}</h1>
          </div>
          {action}
        </header>
        {children}
      </main>
    </div>
  );
}

export function Avatar({ player, size = 'md' }: { player: Player; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';
  return <span className={`${sizeClass} grid shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 font-extrabold text-primary`} data-testid={`avatar-player-${player.id}`}>{initials(player.name)}</span>;
}

export function StatusPill({ status }: { status: Match['status'] }) {
  const live = status === 'live';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mono-label ${live ? 'bg-accent/15 text-accent' : status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`} data-testid={`status-match-${status}`}>
    {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
    {status === 'live' ? 'Live' : status === 'completed' ? 'Final' : 'Upcoming'}
  </span>;
}

export function ScoreDisplay({ match, compact = false }: { match: Match; compact?: boolean }) {
  const orderedSets = [...(match.sets ?? [])].sort((a, b) => a.setNumber - b.setNumber);
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 ${compact ? 'gap-y-2' : 'gap-y-3'}`}>
      {[match.playerA, match.playerB].map((player, playerIndex) => {
        const isWinner = match.winnerId === player.id;
        return (
          <div key={player.id} className="contents">
            <Link href={`/players/${player.id}`} className={`flex min-w-0 items-center gap-2.5 ${isWinner ? 'text-foreground' : 'text-foreground/75'}`} data-testid={`link-match-player-${match.id}-${player.id}`}>
              <Avatar player={player} size="sm" />
              <span className={`truncate text-sm ${isWinner ? 'font-bold' : 'font-medium'}`}>{player.name}</span>
            </Link>
            <span className={`score-number text-xl font-extrabold ${isWinner ? 'text-primary' : 'text-foreground/70'}`} data-testid={`score-match-${match.id}-${player.id}`}>
              {match.status === 'upcoming' ? '—' : orderedSets.filter((set) => playerIndex === 0 ? set.playerAGames > set.playerBGames : set.playerBGames > set.playerAGames).length}
            </span>
            <div className="flex items-center gap-1">
              {orderedSets.slice(0, compact ? 3 : 5).map((set) => <span key={set.id} className="w-5 text-center font-mono text-[11px] text-muted-foreground">{playerIndex === 0 ? set.playerAGames : set.playerBGames}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MatchCard({ match, featured = false }: { match: Match; featured?: boolean }) {
  const [, navigate] = useLocation();
  const goToMatch = () => navigate(`/matches/${match.id}`);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) return;
        goToMatch();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goToMatch();
        }
      }}
      className={`card-sheen group block cursor-pointer rounded-2xl border border-card-border p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_38px_hsl(222_30%_4%/.25)] ${featured ? 'p-5 sm:p-6' : ''}`}
      data-testid={`card-match-${match.id}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <Trophy size={13} className="shrink-0 text-primary" />
          <span className="truncate text-xs font-semibold">{match.tournamentName}</span>
        </div>
        <StatusPill status={match.status} />
      </div>
      <ScoreDisplay match={match} compact={!featured} />
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
        <span>{match.status === 'upcoming' ? formatDate(match.date) : match.resultSummary ?? formatDate(match.date, 'date')}</span>
        <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>
    </div>
  );
}

export function PlayerCard({ player }: { player: Player }) {
  return <Link href={`/players/${player.id}`} className="group flex items-center gap-3 rounded-2xl border border-card-border bg-card/80 p-4 transition hover:-translate-y-0.5 hover:border-primary/35" data-testid={`card-player-${player.id}`}>
    <Avatar player={player} />
    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{player.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{player.country}</span></span>
    <span className="text-right"><span className="mono-label block text-muted-foreground/65">Rank</span><span className="font-mono font-bold text-primary">#{player.currentRanking ?? '—'}</span></span>
  </Link>;
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  return <Link href={`/tournaments/${tournament.id}`} className="group rounded-2xl border border-card-border bg-card/80 p-4 transition hover:-translate-y-0.5 hover:border-primary/35" data-testid={`card-tournament-${tournament.id}`}>
    <div className="mb-5 flex items-start justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent"><Trophy size={16} /></span><ArrowUpRight size={16} className="text-muted-foreground transition group-hover:text-primary" /></div>
    <p className="font-bold leading-tight">{tournament.name}</p><p className="mt-1 text-xs text-muted-foreground">{tournament.region} · {tournament.surface}</p>
    <div className="mt-4 flex gap-2"><span className="rounded bg-muted px-2 py-1 mono-label text-muted-foreground">{tournament.category}</span><span className="rounded bg-muted px-2 py-1 mono-label text-muted-foreground">{tournament.season}</span></div>
  </Link>;
}

export function SectionHeading({ title, count, href }: { title: string; count?: number; href?: string }) {
  return <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><h2 className="text-lg font-extrabold tracking-[-.03em]">{title}</h2>{count !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{count}</span>}</div>{href && <Link href={href} className="text-xs font-bold text-primary transition hover:text-foreground" data-testid={`link-view-${title.toLowerCase().replace(' ', '-')}`}>View all <ChevronRight size={13} className="ml-1 inline" /></Link>}</div>;
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/80 ${className}`} aria-hidden="true" />;
}

export function QueryState({ loading, error, empty, retry, children }: { loading?: boolean; error?: boolean; empty?: boolean; retry?: () => void; children?: React.ReactNode }) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2"><SkeletonBlock className="h-44" /><SkeletonBlock className="h-44" /></div>;
  if (error) return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"><p className="font-bold">The feed missed a beat.</p><p className="mt-1 text-sm text-muted-foreground">We couldn’t reach the match archive.</p><button onClick={retry} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110" data-testid="button-retry">Try again</button></div>;
  if (empty) return <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center"><CalendarDays className="mx-auto text-muted-foreground/60" size={25} /><p className="mt-3 text-sm font-bold">Nothing on this court yet</p><p className="mt-1 text-xs text-muted-foreground">Check back when the order of play settles.</p></div>;
  return <>{children}</>;
}

export function SearchInput({ value, onChange, onSubmit, autoFocus = false }: { value: string; onChange: (value: string) => void; onSubmit: () => void; autoFocus?: boolean }) {
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="relative" data-testid="form-search">
    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search players, tournaments, matches" className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-24 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/10" data-testid="input-search" />
    <button type="submit" className="absolute right-2 top-2 h-10 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground transition hover:brightness-110 active:scale-95" data-testid="button-search">Search</button>
  </form>;
}