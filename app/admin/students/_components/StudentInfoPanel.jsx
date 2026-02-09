"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Copy, MapPin, IdCard } from "lucide-react";

function safe(v) {
  return typeof v === "string" ? v : "";
}

function fmtDate(d) {
  if (!d) return "N/A";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
}

function calcAge(birthdate) {
    if (!birthdate) return "N/A";
    const b = new Date(birthdate);
    if (Number.isNaN(b.getTime())) return "N/A";
    const diff = Date.now() - b.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

function getInitials(fullName) {
    const n = safe(fullName).trim();
    if (!n) return "?";
    return n
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => (x[0] || "").toUpperCase())
        .join("") || "?";
}

function getSection(stu) {
    return stu?.section ?? stu?.section_name ?? stu?.class_section ?? "";
}

export default function StudentInfoPanel({ selectedStudent }) {
    if (!selectedStudent) {
        return (
        <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
            Select a student to view details.
            </CardContent>
        </Card>
        );
    }

    const stu = selectedStudent;

    const suffixPart = stu.suffix ? `, ${stu.suffix}` : "";
    const fullName = `${[stu.first_name, stu.middle_name, stu.last_name].filter(Boolean).join(" ")}${suffixPart}`.trim();

    const address =
        [stu.street, stu.brgy, stu.city, stu.province].filter(Boolean).join(", ") || "N/A";

    const statusBadge = stu.is_disabled ? (
        <Badge variant="destructive">Disabled</Badge>
    ) : (
        <Badge variant="secondary">Active</Badge>
    );

    const levelBadge =
        stu.school_level === "Senior High School" ? (
        <Badge className="bg-purple-100 text-purple-800 border-0">Senior High</Badge>
        ) : stu.school_level === "Junior High School" ? (
        <Badge className="bg-indigo-100 text-indigo-800 border-0">Junior High</Badge>
        ) : (
        <Badge variant="outline">—</Badge>
        );

    const age = calcAge(stu.birthdate);
    const section = getSection(stu);

    const copyToClipboard = async (text) => {
        try {
        await navigator.clipboard.writeText(text || "");
        } catch {}
    };

    return (
        <div className="space-y-4">
        {/* Header */}
        <Card className="rounded-2xl">
            <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
                <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                {stu.supabase_id || "—"}
                </p>

                <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                <AvatarImage src={stu.profile_picture || ""} alt={fullName} />
                <AvatarFallback className="text-lg">
                    {getInitials(fullName)}
                </AvatarFallback>
                </Avatar>

                <h3 className="mt-3 text-xl font-semibold">{fullName || "Unknown Student"}</h3>

                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {statusBadge}
                {levelBadge}
                {stu.program ? <Badge variant="outline">{stu.program}</Badge> : null}
                {stu.grade_level ? <Badge variant="outline">Grade {stu.grade_level}</Badge> : null}
                {stu.gender ? <Badge variant="outline">{stu.gender}</Badge> : null}
                {stu.course ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">
                    {stu.course}
                    </Badge>
                ) : null}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                <span>Created: {fmtDate(stu.created_at)}</span>
                <span className="mx-2">•</span>
                <span>Updated: {fmtDate(stu.updated_at)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Button
                    onClick={() => stu.email && (window.location.href = `mailto:${stu.email}`)}
                    disabled={!stu.email}
                >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                </Button>
                <Button
                    variant="outline"
                    onClick={() => copyToClipboard(stu.email)}
                    disabled={!stu.email}
                >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Email
                </Button>
                </div>
            </div>
            </CardContent>
        </Card>

        {/* Details */}
        <Card className="rounded-2xl">
            <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Username" value={stu.username} />
            <Field label="Email" value={stu.email} />
            <Field label="Birthdate" value={fmtDate(stu.birthdate)} />
            <Field label="Age" value={age} />
            <Field label="Grade Level" value={stu.grade_level} />
            <Field label="School Level" value={stu.school_level} />
            <Field label="Section" value={section} />
            <Field label="Status" value={stu.is_disabled ? "Disabled" : "Active"} />
            <Field
                label="Address"
                value={
                address !== "N/A" ? (
                    <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {address}
                    </span>
                ) : (
                    "N/A"
                )
                }
            />
            </CardContent>
        </Card>
        </div>
    );
}

function Field({ label, value }) {
    return (
        <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-foreground">
            {value ? value : <span className="text-muted-foreground">N/A</span>}
        </span>
        </div>
    );
}