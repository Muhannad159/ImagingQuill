import Link from "next/link";
import { Feather, ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">
        <Feather size={22} />
      </span>
      Imaging<span>Quill</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Main navigation">
        <Link href="/templates">Templates</Link>
        <Link href="/sources">Our sources</Link>
        <Link href="/workspace" className="button small">
          Open workspace <ArrowUpRight size={16} />
        </Link>
      </nav>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <Brand />
      <span>A little more clarity. A deeper understanding.</span>
      <nav>
        <Link href="/privacy">Privacy</Link>
        <Link href="/sources">Sources & use</Link>
      </nav>
    </footer>
  );
}
