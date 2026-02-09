"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function getWindow(current, total, windowSize = 5) {
    if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = start + windowSize - 1;
    if (end > total) {
        end = total;
        start = end - windowSize + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function PaginationBar({ page, totalPages, onPageChange }) {
    const pages = getWindow(page, totalPages, 5);

    return (
        <div className="flex items-center justify-end gap-2 flex-wrap">
        <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p) => (
            <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(p)}
            >
            {p}
            </Button>
        ))}

        <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
        </div>
    );
}