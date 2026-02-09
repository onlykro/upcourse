"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Yes",
    cancelText = "No",
    onConfirm,
    loading,
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{title || "Confirm"}</AlertDialogTitle>
                {description ? (
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                ) : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                    e.preventDefault();
                    onConfirm?.();
                    }}
                    disabled={loading}
                >
                    {loading ? "Please wait..." : confirmText}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}