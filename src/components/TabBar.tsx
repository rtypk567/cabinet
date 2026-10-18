"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Главная",
    icon: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>
    ),
  },
  {
    href: "/operations",
    label: "Операции",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M7 9h10M7 13h10M7 17h6" />
      </>
    ),
  },
  {
    href: "/stats",
    label: "Статистика",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 9 9h-9z" />
        <path d="M12 3v9h9" />
      </>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Разделы">
      {tabs.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "tab active" : "tab"} aria-current={active ? "page" : undefined}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {t.icon}
            </svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
