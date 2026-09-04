import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="sport-shell grid min-h-[100dvh] place-items-center p-6 md:pl-[248px]">
      <div className="w-full max-w-md rounded-3xl border border-card-border bg-card p-8 text-center">
        <CircleAlert className="mx-auto text-primary" size={28} />
        <p className="mono-label mt-5 text-muted-foreground">Out of bounds</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.07em]">That court is empty.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The page you’re looking for is not in today’s draw.</p>
        <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground transition hover:brightness-110" data-testid="link-not-found-home"><ArrowLeft size={15} /> Return to center</Link>
      </div>
    </div>
  );
}
