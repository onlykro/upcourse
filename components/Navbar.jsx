'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import Icon from '@/components/common/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/about', label: 'About' },
];

const themeOptions = [
  { value: 'blue', label: 'Blue', color: '#2563eb' },
  { value: 'teal', label: 'Teal', color: '#14b8a6' },
  { value: 'purple', label: 'Purple', color: '#8b5cf6' }
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, accentTheme, toggleTheme, setAccentTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        isScrolled 
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' 
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 font-bold text-xl text-foreground"
          >
            <div className="w-8 h-8 relative">
              <Image
                src="/logo.png"
                alt="UpCourse logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>

            <div className="w-20 h-8 relative">
              <Image
                src="/word.png"
                alt="UpCourse Wordmark"
                height={32}
                width={120}   // any reasonable wide value
                className="object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-4 py-2 text-sm font-bold transition-colors',
                    isActive 
                      ? 'text-primary font-bold' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Icon name="palette" size={18} />
                  <span className="sr-only">Theme settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Color Mode
                </div>
                <DropdownMenuItem onClick={toggleTheme}>
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} className="mr-2" />
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Accent Color
                </div>
                {themeOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setAccentTheme(option.value)}
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-2 border border-border"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                    {accentTheme === option.value && (
                      <Icon name="check" size={14} className="ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark mode quick toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              <Icon 
                name={theme === 'dark' ? 'sun' : 'moon'} 
                size={18}
              />
              <span className="sr-only">Toggle dark mode</span>
            </Button>

            {/* Login button */}
            <Button asChild className="hidden sm:inline-flex rounded-xl">
              <Link href="/admin/login">
                <Icon name="log-in" size={16} className="mr-2" />
                Admin Login
              </Link>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Icon name={mobileMenuOpen ? 'x' : 'menu'} size={20} />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'block px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-border mt-4 space-y-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-muted-foreground">Dark Mode</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={toggleTheme}
                  >
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
                  </Button>
                </div>
              <Button asChild className="w-full">
                <Link href="/admin/login" className="rounded-full">
                  <Icon name="log-in" size={16} className="mr-2" />
                  Admin Login
                </Link>
              </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
