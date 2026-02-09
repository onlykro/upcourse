'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // dim + subtle blur (UpCourse feel)
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]',
        // radix animations
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /**
   * Presets:
   * - "sm": default modal
   * - "md": medium
   * - "lg": large (good for details pages)
   * - "xl": extra large
   * - "full": near-fullscreen (mobile friendly)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const SIZE: Record<NonNullable<DialogContentProps['size']>, string> = {
  sm: 'sm:max-w-lg',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl lg:max-w-4xl',
  xl: 'sm:max-w-4xl lg:max-w-5xl',
  // near-fullscreen, still padded
  full: 'sm:max-w-[calc(100vw-3rem)] lg:max-w-[calc(100vw-6rem)]'
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = 'sm',
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // positioning
          'fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%]',
          // layout
          'grid gap-4',
          // base UI
          'rounded-4xl border bg-background shadow-xl',
          // better scrolling for large dialogs
          'max-h-[calc(100dvh-2rem)] overflow-hidden',
          // radix animations (slightly softer)
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          'data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2',
          'duration-200',
          // IMPORTANT: sizing preset (this is what fixes your “skinny dialog on desktop” issue)
          SIZE[size],
          // allow caller to override (className LAST)
          className
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              'absolute right-4 top-4',
              'inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-background/70 backdrop-blur',
              'text-muted-foreground shadow-sm transition',
              'hover:text-foreground hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              'disabled:pointer-events-none'
            )}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-black leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground font-semibold', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
