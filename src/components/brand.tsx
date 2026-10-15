import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 tracking-[0.18em]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
        C
      </span>
      <span className="text-sm font-extrabold text-foreground">CAPITUNE</span>
    </Link>
  );
}
