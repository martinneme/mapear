"use client";
import { usePathname } from "next/navigation";

export default function FooterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith("/map");
  if (isMap) return null;
  return <>{children}</>;
}
