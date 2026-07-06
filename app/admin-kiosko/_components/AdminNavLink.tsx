"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function routePath(href: string) {
  return href.split("#")[0]?.split("?")[0] || href;
}

export function AdminNavLink({
  href,
  children,
  className,
  activeClassName,
  exact = false,
}: {
  href: string;
  children: ReactNode;
  className: string;
  activeClassName: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const target = routePath(href);
  const isRoot = target === "/admin-kiosko";
  const active = exact || isRoot
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      aria-current={exact && active ? "page" : undefined}
      className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb] ${active ? activeClassName : ""}`}
    >
      {children}
    </Link>
  );
}
