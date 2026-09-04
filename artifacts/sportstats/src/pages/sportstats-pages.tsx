import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowLeft, BarChart3, CalendarDays, Clock3, Globe2, Layers3, Search, Sparkles, Trophy } from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getListMatchesQueryKey,
  getSearchQueryKey,
  useGetDashboard,
  useGetMatch,
  useGetPlayer,
  useGetTournament,
  useListSports,
  useListMatches,
  useSearch,
} from '@workspace/api-client-react';
import {
  formatDate,
  MatchCard,
  PageFrame,
  PlayerCard,
  QueryState,
  SearchInput,
  SectionHeading,
  ScoreDisplay,
  SkeletonBlock,
  StatusPill,
  TournamentCard,
} from '@/components/sportstats';

const toId = (value?: string) => Number(value ?? 0);

function DashboardSection({ title, matches, href }: { title: string; matches?: import('@workspace/api-client-react').Match[]; href?: string }) {
  return <section className="animate-rise-in"><SectionHeading title={title} count={matches?.length ?? 0} href={href} /><QueryState empty={!matches?.length}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{matches?.map((match) => <MatchCard key={match.id} match={match} />)}</div></QueryState></section>;
}

export function DashboardPage() {
  const [selectedSport, setSelectedSport] = useState<number | undefined>();
  const [, setLocation] = useLocation();
  const sports = useListSports();
  const dashboard = useGetDashboard(selectedSport ? { sportId: selectedSport } : undefined, {
    query: { queryKey: getGetDashboardQueryKey(selectedSport ? { sportId: selectedSport } : undefined) },
  });
  const allMatches = useListMatches(selectedSport ? { sportId: selectedSport } : undefined, {
    query: { queryKey: getListMatchesQueryKey(selectedSport ? { sportId: selectedSport } : undefined) },
  });
  const feed = dashboard.data;
  const activeSport = feed?.sport ?? sports.data?.find((sport) => sport.id === selectedSport) ?? sports.data?.[0];

  return <PageFrame eyebrow={activeSport?.name ?? 'Tennis'} title="Match center" action={<button onClick={() => setLocation('/search')} className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/45 hover:text-primary" aria-label="Search" data-testid="button-open-search"><Search size={17} /></button>}>
    <div className="mb-9 overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_85%_20%,hsl(var(--accent)/.18),transparent_28%),linear-gradient(135deg,hsl(var(--card)),hsl(222_28%_10%))] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
        <div><p className="mono-label text-primary">The daily point</p><p className="mt-3 max-w-lg text-2xl font-extrabold leading-tight tracking-[-.05em] sm:text-3xl">The court is quiet.<br /><span className="text-foreground/55">The score is not.</span></p><p className="mt-3 text-sm text-muted-foreground">Your fast read on what matters today.</p></div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> {allMatches.data?.length ?? 0} matches in rotation</div>
      </div>
    </div>
    <div className="mb-9 flex gap-2 overflow-x-auto pb-1 no-scrollbar" data-testid="sport-selector">
      <button onClick={() => setSelectedSport(undefined)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${selectedSport === undefined ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`} data-testid="button-sport-all">All sports</button>
      {sports.isLoading ? <><SkeletonBlock className="h-8 w-20 rounded-full" /><SkeletonBlock className="h-8 w-20 rounded-full" /></> : sports.data?.map((sport) => <button key={sport.id} onClick={() => setSelectedSport(sport.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${selectedSport === sport.id ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`} data-testid={`button-sport-${sport.id}`}>{sport.name}</button>)}
    </div>
    <QueryState loading={dashboard.isLoading} error={dashboard.isError} retry={() => dashboard.refetch()}>
      <div className="space-y-10">
        <DashboardSection title="Live now" matches={feed?.live} />
        <DashboardSection title="Today" matches={feed?.today} />
        <div className="grid gap-10 lg:grid-cols-2"><DashboardSection title="Up next" matches={feed?.upcoming} /><DashboardSection title="Completed" matches={feed?.completed} /></div>
      </div>
    </QueryState>
  </PageFrame>;
}

export function MatchPage() {
  const params = useParams<{ id: string }>();
  const id = toId(params.id);
  const match = useGetMatch(id);
  const data = match.data;
  return <PageFrame eyebrow="Scorecard" title={data?.tournamentName ?? 'Match details'} action={<Link href="/" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary" data-testid="link-back-center"><ArrowLeft size={15} /> Back</Link>}>
    <QueryState loading={match.isLoading} error={match.isError} retry={() => match.refetch()} empty={!data}>
      {data && <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-3xl border border-card-border bg-card p-5 sm:p-8">
          <div className="mb-8 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between"><div><Link href={`/tournaments/${data.tournament.id}`} className="text-sm font-bold text-primary hover:text-foreground" data-testid={`link-match-tournament-${data.tournament.id}`}>{data.tournament.name}</Link><p className="mt-1 text-xs text-muted-foreground">{data.tournament.region} · {data.tournament.surface} · {data.tournament.category}</p></div><div className="flex items-center gap-3"><StatusPill status={data.status} /><span className="text-xs text-muted-foreground">{formatDate(data.date)}</span></div></div>
          <div className="grid gap-8 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="text-center sm:text-right"><Link href={`/players/${data.playerA.id}`} className="font-extrabold tracking-[-.04em] hover:text-primary" data-testid={`link-scorecard-player-${data.playerA.id}`}>{data.playerA.name}</Link><p className="mt-1 text-xs text-muted-foreground">{data.playerA.country} · #{data.playerA.currentRanking ?? '—'}</p></div><div className="text-center"><span className="mono-label text-muted-foreground">{data.status === 'completed' ? 'Final score' : data.status === 'live' ? 'Current score' : 'First serve'}</span><div className="mt-2 text-4xl font-extrabold tracking-[-.08em] text-primary">{data.status === 'upcoming' ? formatDate(data.date, 'time') : `${data.resultSummary ?? 'In play'}`}</div></div><div className="text-center sm:text-left"><Link href={`/players/${data.playerB.id}`} className="font-extrabold tracking-[-.04em] hover:text-primary" data-testid={`link-scorecard-player-${data.playerB.id}`}>{data.playerB.name}</Link><p className="mt-1 text-xs text-muted-foreground">{data.playerB.country} · #{data.playerB.currentRanking ?? '—'}</p></div></div>
        </div>
        <div className="rounded-3xl border border-card-border bg-card p-5 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><p className="mono-label text-primary">Match breakdown</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.04em]">Set by set</h2></div><BarChart3 size={20} className="text-muted-foreground" /></div><div className="rounded-2xl bg-muted/45 p-4 sm:p-6"><ScoreDisplay match={data} /></div>{data.winnerId && <div className="mt-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"><Trophy size={16} className="text-primary" /><span>Winner</span><strong>{data.winnerId === data.playerA.id ? data.playerA.name : data.playerB.name}</strong></div>}</div>
        <div className="grid gap-4 sm:grid-cols-3"><InfoStat icon={<CalendarDays size={16} />} label="Date" value={formatDate(data.date, 'date')} /><InfoStat icon={<Clock3 size={16} />} label="Start time" value={formatDate(data.date, 'time')} /><InfoStat icon={<Layers3 size={16} />} label="Surface" value={data.tournament.surface} /></div>
      </div>}
    </QueryState>
  </PageFrame>;
}

function InfoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-card-border bg-card/80 p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="mono-label text-muted-foreground">{label}</span></div><p className="mt-3 font-bold">{value}</p></div>;
}

export function PlayerPage() {
  const params = useParams<{ id: string }>();
  const query = useGetPlayer(toId(params.id));
  const data = query.data;
  return <PageFrame eyebrow="Player profile" title={data?.player.name ?? 'Player'} action={<Link href="/" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary" data-testid="link-player-back"><ArrowLeft size={15} /> Match center</Link>}>
    <QueryState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={!data}>
      {data && <div className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]"><div className="rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_90%_20%,hsl(var(--primary)/.13),transparent_26rem),hsl(var(--card))] p-6 sm:p-8"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground">{data.player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><h2 className="text-2xl font-extrabold tracking-[-.06em]">{data.player.name}</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Globe2 size={14} /> {data.player.country}</p></div></div><div className="mt-9 flex items-end justify-between"><div><p className="mono-label text-muted-foreground">World ranking</p><p className="mt-1 text-5xl font-extrabold tracking-[-.09em] text-primary">#{data.player.currentRanking ?? '—'}</p></div><span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">Active season</span></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">{[['Wins', data.wins], ['Losses', data.losses], ['Win rate', `${data.winPercentage}%`], ['Matches', data.wins + data.losses]].map(([label, value]) => <div key={label} className="rounded-2xl border border-card-border bg-card p-4"><p className="mono-label text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-[-.06em]">{value}</p></div>)}</div></div>
        <section><SectionHeading title="Recent matches" count={data.recentMatches.length} /><div className="grid gap-3 sm:grid-cols-2">{data.recentMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>{!data.recentMatches.length && <QueryState empty />}</section>
      </div>}
    </QueryState>
  </PageFrame>;
}

export function TournamentPage() {
  const params = useParams<{ id: string }>();
  const query = useGetTournament(toId(params.id));
  const data = query.data;
  return <PageFrame eyebrow="Tournament profile" title={data?.tournament.name ?? 'Tournament'} action={<Link href="/" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary" data-testid="link-tournament-back"><ArrowLeft size={15} /> Match center</Link>}>
    <QueryState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={!data}>
      {data && <div className="space-y-8"><div className="rounded-3xl border border-accent/25 bg-[radial-gradient(circle_at_90%_10%,hsl(var(--accent)/.16),transparent_25rem),hsl(var(--card))] p-6 sm:p-8"><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent"><Trophy size={22} /></div><h2 className="text-3xl font-extrabold tracking-[-.07em]">{data.tournament.name}</h2><p className="mt-2 text-sm text-muted-foreground">{data.tournament.region} · {data.tournament.season} season</p></div><div className="grid grid-cols-3 gap-5 text-left sm:text-right"><div><p className="mono-label text-muted-foreground">Surface</p><p className="mt-2 font-bold">{data.tournament.surface}</p></div><div><p className="mono-label text-muted-foreground">Category</p><p className="mt-2 font-bold">{data.tournament.category}</p></div><div><p className="mono-label text-muted-foreground">Region</p><p className="mt-2 font-bold">{data.tournament.region}</p></div></div></div></div><div className="grid gap-10 lg:grid-cols-2"><section><SectionHeading title="Upcoming matches" count={data.upcomingMatches.length} /><QueryState empty={!data.upcomingMatches.length}><div className="space-y-3">{data.upcomingMatches.map((match) => <MatchCard key={match.id} match={match} featured />)}</div></QueryState></section><section><SectionHeading title="Completed matches" count={data.completedMatches.length} /><QueryState empty={!data.completedMatches.length}><div className="space-y-3">{data.completedMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div></QueryState></section></div></div>}
    </QueryState>
  </PageFrame>;
}

export function SearchPage() {
  const [location, setLocation] = useLocation();
  const initial = new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search,
  ).get('q') ?? '';
  const [value, setValue] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const params = useMemo(() => ({ q: submitted || ' ' }), [submitted]);
  const query = useSearch(params, { query: { enabled: submitted.trim().length > 0, queryKey: getSearchQueryKey(params) } });
  const results = query.data;
  const submit = () => { const clean = value.trim(); if (!clean) return; setSubmitted(clean); setLocation(`/search?q=${encodeURIComponent(clean)}`); };
  const total = (results?.players.length ?? 0) + (results?.tournaments.length ?? 0) + (results?.matches.length ?? 0);
  return <PageFrame eyebrow="Explore the archive" title="Search" action={<Link href="/" className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary" data-testid="link-search-back"><ArrowLeft size={15} /> Match center</Link>}>
    <div className="mx-auto max-w-4xl"><div className="mb-8"><SearchInput value={value} onChange={setValue} onSubmit={submit} autoFocus /></div>
      {!submitted ? <div className="rounded-3xl border border-dashed border-border bg-card/30 p-14 text-center"><Sparkles className="mx-auto text-primary" size={25} /><h2 className="mt-4 text-xl font-extrabold tracking-[-.04em]">Find your next match</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Search by player, tournament, or match. The archive remembers every point.</p></div> : <QueryState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={!query.isLoading && total === 0}><div className="space-y-9">{results?.players.length ? <section><SectionHeading title="Players" count={results.players.length} /><div className="grid gap-3 sm:grid-cols-2">{results.players.map((player) => <PlayerCard key={player.id} player={player} />)}</div></section> : null}{results?.tournaments.length ? <section><SectionHeading title="Tournaments" count={results.tournaments.length} /><div className="grid gap-3 sm:grid-cols-2">{results.tournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}</div></section> : null}{results?.matches.length ? <section><SectionHeading title="Matches" count={results.matches.length} /><div className="grid gap-3 sm:grid-cols-2">{results.matches.map((match) => <MatchCard key={match.id} match={match} />)}</div></section> : null}</div></QueryState>}
    </div>
  </PageFrame>;
}