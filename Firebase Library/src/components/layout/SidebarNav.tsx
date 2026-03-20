'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  LayoutDashboard,
  BookCheck,
  History,
  Building,
  Settings,
  BarChart3,
  BookCopy,
  QrCode,
  Moon,
  Sun,
  ListChecks,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import type { UserRole } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

type AppRole = UserRole | 'guest';

// Defines the navigation items available in the sidebar.
const navItems: NavItem[] = [
  // Admin-specific items
  { href: '/admin/statistics', label: 'Statistics', icon: BarChart3, roles: ['admin'] },
  { href: '/admin/visitors-info', label: 'Visitors Info', icon: BookCopy, roles: ['admin'] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { href: '/admin/colleges', label: 'Colleges & Programs', icon: Building, roles: ['admin'] },
  { href: '/admin/purposes', label: 'Purposes', icon: ListChecks, roles: ['admin'] },
  { href: '/admin/qr-code', label: 'QR Code', icon: QrCode, roles: ['admin'] },
  { href: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  
  // User-specific items
  { href: '/history', label: 'My History', icon: History, roles: ['user'] },
  { href: '/my-qr-code', label: 'My QR Code', icon: QrCode, roles: ['user'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['user'] },

  // Items for both regular users and guests
  { href: '/check-in', label: 'Check In', icon: BookCheck, roles: ['user', 'guest'] },
];

/**
 * The SidebarNav component renders the primary navigation menu.
 * It filters navigation items based on the user's role ('admin', 'user', or 'guest').
 */
export function SidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Effect to set initial theme from localStorage or system preference
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
    } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
    }
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Filter nav items based on the current role.
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="flex h-full flex-col justify-between">
      <SidebarMenu>
        {filteredNavItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
              asChild
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      
      {role !== 'guest' && (
        <div className="mt-auto border-t p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode-toggle" className="flex items-center gap-2 text-sm font-normal">
              <Sun className="h-4 w-4 transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 transition-all scale-0 rotate-90 dark:rotate-0 dark:scale-100" />
              <span>Dark Mode</span>
            </Label>
            <Switch
              id="dark-mode-toggle"
              checked={isDarkMode}
              onCheckedChange={toggleDarkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Define the type for a navigation item for clarity and type safety.
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: AppRole[];
}
