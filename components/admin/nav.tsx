"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/lookup", label: "Preview" },
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/bulk-upload", label: "Bulk Upload" },
  { href: "/admin/crawl", label: "Crawler" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/orgs", label: "Organisations" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-amber-900/40 bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <span className="text-amber-400 font-mono font-semibold text-sm">ByLawsIndex.com Admin</span>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
