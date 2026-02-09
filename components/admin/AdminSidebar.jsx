"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthContext";
import Icon from "@/components/common/Icon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: "LayoutDashboard",
  },
  {
    title: "Students",
    href: "/admin/students",
    icon: "Users",
  },
  {
    title: "Tracks",
    href: "/admin/tracks",
    icon: "Route",
  },
  {
    title: "Subjects",
    href: "/admin/subjects",
    icon: "BookOpen",
  },
  {
    title: "Resources",
    href: "/admin/resources",
    icon: "FileText",
  },
  {
    title: "Assessments",
    href: "/admin/assessments",
    icon: "ClipboardList",
  },
];

const bottomNavItems = [
  // {
  //   title: "Settings",
  //   href: "/admin/settings",
  //   icon: "Settings",
  // },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "super_admin":
        return "bg-primary text-primary-foreground";
      case "admin":
        return "bg-emerald-500/90 text-white";
      case "editor":
        return "bg-amber-500/90 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "editor":
        return "Editor";
      case "viewer":
        return "Viewer";
      default:
        return role;
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen",
        "bg-sidebar/95 backdrop-blur-md border-r border-sidebar-border",
        "flex flex-col shadow-sm"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
          >
            <Image
              src="/logo.png"
              alt="UpCourse logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-xl text-sidebar-foreground"
              >
                <Image
                  src="/word.png"
                  alt="UpCourse Wordmark"
                  height={32}
                  width={100}   // any reasonable wide value
                  className="object-contain"
                />
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    active ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium truncate"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom nav */}
        <div className="mt-auto pt-4 border-t border-sidebar-border mt-6">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    active ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User menu */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg",
                "hover:bg-sidebar-accent transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-2 focus:ring-offset-sidebar"
              )}
            >
              <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-background">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-semibold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-semibold text-sidebar-foreground truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {user?.email}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {!collapsed && (
                <Icon name="ChevronsUpDown" className="w-4 h-4 text-sidebar-foreground/50 flex-shrink-0" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={collapsed ? "center" : "end"}
            side="top"
            className="w-56"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full w-fit mt-1 font-medium", getRoleBadgeColor(user?.role))}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer">
                <Icon name="Settings" className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem> */}
            <DropdownMenuItem asChild>
              <Link href="/" className="cursor-pointer">
                <Icon name="Home" className="w-4 h-4 mr-2" />
                View Site
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <Icon name="LogOut" className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse toggle */}
      <div className="absolute -right-3 top-20">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggle}
            className="h-6 w-6 rounded-full border-sidebar-border bg-sidebar shadow-md hover:shadow-lg transition-shadow"
          >
            <Icon
              name={collapsed ? "ChevronRight" : "ChevronLeft"}
              className="w-3 h-3"
            />
          </Button>
        </motion.div>
      </div>
    </motion.aside>
  );
}
