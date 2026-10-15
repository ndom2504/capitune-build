import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-medium tracking-tight">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-accent text-sm text-white">
        C
      </span>
      <span>Capitune</span>
    </Link>
  );
}
