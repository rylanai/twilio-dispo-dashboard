"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Templates", icon: FileIcon },
  { href: "/blast", label: "Blast", icon: RocketIcon },
  { href: "/live", label: "Live Feed", icon: RadioIcon },
  { href: "/replies", label: "Replies", icon: InboxIcon },
  { href: "/optouts", label: "Opt-Outs", icon: ShieldIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col z-50">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4l6 4 6-4M2 12l6-4 6 4" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">SMS Dashboard</span>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-[#888] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <item.icon active={isActive} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-6 py-6 border-t border-[#1e1e1e]">
        <p className="text-[11px] text-[#555] font-medium">Powered by Twilio</p>
      </div>
    </aside>
  );
}

function FileIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "#fff" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z"/>
      <path d="M9 1v4h4M6 8h4M6 11h4"/>
    </svg>
  );
}

function RocketIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "#fff" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14s-3-2-4.5-5.5S3 2 8 1c5 1 5 4 3.5 7.5S8 14 8 14z"/>
      <circle cx="8" cy="6" r="1.5"/>
    </svg>
  );
}

function RadioIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "#fff" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2"/>
      <path d="M5 5a4.24 4.24 0 000 6M11 5a4.24 4.24 0 010 6M3 3a7.07 7.07 0 000 10M13 3a7.07 7.07 0 010 10"/>
    </svg>
  );
}

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "#fff" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h3l1 2h2l1-2h3"/>
      <path d="M3.5 4L2 9v4a1 1 0 001 1h10a1 1 0 001-1V9l-1.5-5a1 1 0 00-1-.96H4.5a1 1 0 00-1 .96z"/>
    </svg>
  );
}

function ShieldIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "#fff" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z"/>
      <path d="M6 8l1.5 1.5L10 6"/>
    </svg>
  );
}
