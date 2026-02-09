"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import {
  Download as DownloadIcon,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  HardDrive,
  CalendarDays,
  Wifi,
  ExternalLink,
  Info,
} from "lucide-react";

import { getLatestDownload } from "@/lib/api";

const DOWNLOAD_LINK =
  "https://download1529.mediafire.com/bnkwag4oufjgiCTyrbRmp-dFD41RYHC5fmB3iyhl1OyGYqfZX7nYUTplIGAb_ugBKpNUUSXYkRKtSQwGcxgswfuxUkSPu9p5dFKVQtzZ1EQ07R_uyKOQkLq5L5p6IcXIWUypS-uLlTyRT7apyJzEXsVgt8SASYBhRQGjeHtdry4uoA/3u85sh2qzlu83lz/upcourse.apk";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut", delay: d },
  }),
};

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StatPill({ icon: IconComp, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 shadow-sm backdrop-blur">
      <IconComp className="h-4 w-4 text-primary" />
      <span className="text-xs sm:text-sm font-semibold text-foreground">
        {label}
      </span>
    </div>
  );
}

function SkeletonLine({ w = "w-40" }) {
  return <div className={`h-4 ${w} rounded-full bg-muted animate-pulse`} />;
}

function SmartLink({ href, children, onClick, className = "" }) {
  const isExternal = typeof href === "string" && /^https?:\/\//.test(href);
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

export default function DownloadsPage() {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await getLatestDownload?.("stable");
        if (!alive) return;
        if (res?.data) setLatest(res.data);
      } catch {
        // ignore — fallback UI will display
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const meta = useMemo(() => {
    const version = latest?.version || "Alpha";
    const size = latest?.size || "APK";
    const date = latest?.release_date ? formatDate(latest.release_date) : "";
    const type = latest?.release_type
      ? String(latest.release_type).toUpperCase()
      : "RELEASE";
    return { version, size, date, type };
  }, [latest]);

  const onDownloadClick = () => {
    toast({
      title: "Download started",
      description: "Your APK download should begin shortly.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-background">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* HERO */}
        <section className="relative overflow-hidden">
          {/* Decorative gradients */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -left-48 -top-36 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-3xl mix-blend-screen"
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-48 top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl mix-blend-screen"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={
              reduceMotion
                ? { scale: 1, opacity: 1 }
                : { scale: [1, 1.06, 1], opacity: 1 }
            }
            transition={
              reduceMotion
                ? { duration: 0.6 }
                : { duration: 7, repeat: Infinity, ease: "easeInOut" }
            }
          />

          <div className="relative z-10 px-4 pt-10 pb-10 sm:pt-14 sm:pb-14">
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-10 lg:gap-12 items-center">
                {/* LEFT */}
                <div className="lg:col-span-7">
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="max-w-2xl lg:max-w-none"
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge
                        className="rounded-full px-3 sm:px-4 py-1.5 font-black"
                        variant="secondary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <DownloadIcon className="h-4 w-4" />
                          Official App Download
                        </span>
                      </Badge>

                      <Badge
                        className="rounded-full px-3 sm:px-4 py-1.5 font-black"
                        variant="outline"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Android APK
                        </span>
                      </Badge>
                    </div>

                    <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.06]">
                      Download <span className="text-primary">UpCourse</span>
                    </h1>

                    <p className="mt-4 text-base sm:text-lg text-muted-foreground font-semibold leading-relaxed">
                      Get the latest APK for Android. Career assessment, track
                      recommendations, and guided resources — designed for Marian
                      College of Baliuag SHS students.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                      <StatPill icon={Smartphone} label="Android 7.0+ supported" />
                      <StatPill icon={ShieldCheck} label="Install guide included" />
                      <StatPill icon={Sparkles} label="Student-first experience" />
                    </div>

                    {/* CTA row (use HomePage button style) */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-md sm:max-w-none">
                      <Button
                        asChild
                        variant="playful"
                        size="lg"
                        className="w-full rounded-2xl px-6 py-3 font-bold transform-gpu"
                      >
                        <SmartLink
                          href={DOWNLOAD_LINK}
                          onClick={onDownloadClick}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <DownloadIcon className="h-5 w-5" />
                          Download App
                          <ExternalLink className="h-4 w-4 opacity-80" />
                        </SmartLink>
                      </Button>

                      <Button
                        asChild
                        variant="playfulOutline"
                        size="lg"
                        className="w-full rounded-2xl px-6 py-3 font-bold bg-transparent border-2"
                      >
                        <SmartLink
                          href="#install"
                          className="inline-flex items-center justify-center gap-2"
                        >
                          How to Install
                          <ArrowRight className="h-5 w-5" />
                        </SmartLink>
                      </Button>
                    </div>

                    {/* Meta */}
                    <div className="mt-4 text-sm text-muted-foreground font-medium">
                      {loading ? (
                        <div className="flex flex-col gap-2">
                          <SkeletonLine w="w-64" />
                          <SkeletonLine w="w-40" />
                        </div>
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="inline-flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Latest:
                          </span>
                          <span className="font-black text-foreground">
                            {meta.type} v{meta.version}
                          </span>
                          {meta.size ? <span>• {meta.size}</span> : null}
                          {meta.date ? <span>• {meta.date}</span> : null}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* RIGHT */}
                <div className="lg:col-span-5">
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0.12}
                    className="lg:pl-2"
                  >
                    <Card className="overflow-hidden rounded-3xl border-border shadow-2xl">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />

                        <CardHeader className="relative p-5 sm:p-6 md:p-7">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-black">
                                UpCourse APK
                              </CardTitle>
                              <CardDescription className="mt-1 text-sm sm:text-base font-semibold">
                                Fast install • Lightweight • Built for students
                              </CardDescription>

                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                <Badge className="rounded-full font-black" variant="secondary">
                                  {loading ? "…" : `v${meta.version}`}
                                </Badge>

                                <Badge className="rounded-full font-black" variant="outline">
                                  <span className="inline-flex items-center gap-2">
                                    <HardDrive className="h-4 w-4" />
                                    {loading ? "…" : meta.size}
                                  </span>
                                </Badge>

                                <Badge className="rounded-full font-black" variant="outline">
                                  <span className="inline-flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    {loading ? "…" : meta.date || "—"}
                                  </span>
                                </Badge>
                              </div>
                            </div>

                            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-border bg-card flex items-center justify-center shadow-sm">
                              <DownloadIcon className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="relative p-5 sm:p-6 md:p-7 pt-0">
                          {/* mini preview row */}
                          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 sm:p-4 backdrop-blur">
                            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                              <Image
                                src="/logo.png"
                                alt="UpCourse logo"
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-foreground truncate">
                                UpCourse
                              </div>
                              <div className="text-xs text-muted-foreground font-semibold truncate">
                                Career Guidance App
                              </div>
                            </div>

                            <Badge className="rounded-full font-black" variant="secondary">
                              Android
                            </Badge>
                          </div>

                          {/* bullets */}
                          <div className="mt-5 grid gap-2 text-sm text-muted-foreground font-semibold">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                              <span>Works on Android 7.0+ (Nougat and above)</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                              <span>Assessment + track/strand guidance features</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Wifi className="h-4 w-4 text-primary mt-0.5" />
                              <span>Internet recommended for updates and sync</span>
                            </div>
                          </div>

                          {/* download buttons (use HomePage style) */}
                          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                              asChild
                              variant="playful"
                              size="lg"
                              className="w-full rounded-2xl px-6 py-3 font-bold transform-gpu"
                            >
                              <SmartLink
                                href={DOWNLOAD_LINK}
                                onClick={onDownloadClick}
                                className="inline-flex items-center justify-center gap-2"
                              >
                                <DownloadIcon className="h-5 w-5" />
                                Download
                                <ExternalLink className="h-4 w-4 opacity-80" />
                              </SmartLink>
                            </Button>

                            <Button
                              asChild
                              variant="playfulOutline"
                              size="lg"
                              className="w-full rounded-2xl px-6 py-3 font-bold bg-transparent border-2"
                            >
                              <SmartLink
                                href="#requirements"
                                className="inline-flex items-center justify-center gap-2"
                              >
                                Requirements
                                <ArrowRight className="h-5 w-5" />
                              </SmartLink>
                            </Button>
                          </div>

                          <p className="mt-3 text-xs text-muted-foreground font-semibold">
                            If Android warns about “unknown apps”, follow the install steps below.
                          </p>
                        </CardContent>
                      </div>
                    </Card>

                    {/* Optional phone artwork (hidden on small screens to avoid cramped layout) */}
                    <div className="hidden lg:block mt-6">
                      <div className="rounded-3xl border border-border bg-card/60 p-5 backdrop-blur shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                            <Image
                              src="/word.png"
                              alt="UpCourse wordmark"
                              width={120}
                              height={40}
                              className="object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-foreground">
                              Install in minutes
                            </div>
                            <div className="text-xs text-muted-foreground font-semibold">
                              Scroll for the 3-step guide
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* subtle bottom divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
        </section>

        {/* INSTALL STEPS */}
        <section id="install" className="px-4 py-12 sm:py-16 bg-muted/30">
          <div className="mx-auto max-w-7xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">
                Install in 3 Steps
              </h2>
              <p className="mt-3 text-base sm:text-lg text-muted-foreground font-semibold">
                Simple steps if Android blocks the install.
              </p>
            </motion.div>

            <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  n: "01",
                  icon: DownloadIcon,
                  title: "Download the APK",
                  desc: "Tap the Download button. Save the file on your device.",
                },
                {
                  n: "02",
                  icon: ShieldCheck,
                  title: "Allow install (if needed)",
                  desc:
                    'Settings → Security/Privacy → enable “Install unknown apps” for your browser or file manager.',
                },
                {
                  n: "03",
                  icon: CheckCircle2,
                  title: "Open & Install",
                  desc: "Open the downloaded file and follow the prompts. Done!",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i * 0.06}
                >
                  <Card className="h-full rounded-3xl border-border shadow-sm hover:shadow-xl transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-muted-foreground">
                          {step.n}
                        </div>
                        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <step.icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="mt-4 text-lg font-black text-foreground">
                        {step.title}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground font-semibold leading-relaxed">
                        {step.desc}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
              <Button
                asChild
                size="lg"
                variant="playful"
                className="w-full rounded-2xl px-6 py-3 font-bold transform-gpu shadow-lg"
              >
                <SmartLink
                  href={DOWNLOAD_LINK}
                  onClick={onDownloadClick}
                  className="inline-flex items-center justify-center gap-2"
                >
                  <DownloadIcon className="h-5 w-5" />
                  Download UpCourse
                  <ExternalLink className="h-4 w-4 opacity-80" />
                </SmartLink>
              </Button>

              <Button
                asChild
                size="lg"
                variant="playfulOutline"
                className="w-full rounded-2xl px-6 py-3 font-bold bg-transparent border-2"
              >
                <SmartLink
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2"
                >
                  Need help?
                  <ArrowRight className="h-5 w-5" />
                </SmartLink>
              </Button>
            </div>
          </div>
        </section>

        {/* REQUIREMENTS */}
        <section id="requirements" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">
                System Requirements
              </h2>
              <p className="mt-3 text-base sm:text-lg text-muted-foreground font-semibold">
                Works on most modern Android phones.
              </p>
            </motion.div>

            <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card className="rounded-3xl border-border shadow-sm">
                <CardHeader className="p-5 sm:p-6">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Minimum
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Basic requirements for installation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <ul className="space-y-2 text-sm text-muted-foreground font-semibold">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      Android 7.0 (Nougat) or later
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      50 MB free storage
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      2 GB RAM
                    </li>
                    <li className="flex items-start gap-2">
                      <Wifi className="h-4 w-4 text-primary mt-0.5" />
                      Internet for updates
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border shadow-sm">
                <CardHeader className="p-5 sm:p-6">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Recommended
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Smoother performance and experience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <ul className="space-y-2 text-sm text-muted-foreground font-semibold">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      Android 10 or later
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      100 MB free storage
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      4 GB RAM
                    </li>
                    <li className="flex items-start gap-2">
                      <Wifi className="h-4 w-4 text-primary mt-0.5" />
                      Stable Wi-Fi connection
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Bottom CTA */}
            <div className="mt-8 sm:mt-10">
              <Card className="rounded-3xl border-border shadow-sm bg-muted/30">
                <CardContent className="p-5 sm:p-8">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 text-sm font-black text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        Official Download
                      </div>
                      <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground">
                        Ready to install UpCourse?
                      </div>
                      <p className="mt-2 text-sm sm:text-base text-muted-foreground font-semibold">
                        Tap download and follow the 3-step guide if your device asks for permission.
                      </p>
                    </div>

                    <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        asChild
                        size="lg"
                        variant="playful"
                        className="w-full rounded-2xl px-6 py-3 font-bold transform-gpu shadow-lg"
                      >
                        <SmartLink
                          href={DOWNLOAD_LINK}
                          onClick={onDownloadClick}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <DownloadIcon className="h-5 w-5" />
                          Download App
                          <ExternalLink className="h-4 w-4 opacity-80" />
                        </SmartLink>
                      </Button>

                      <Button
                        asChild
                        size="lg"
                        variant="playfulOutline"
                        className="w-full rounded-2xl px-6 py-3 font-bold bg-transparent border-2"
                      >
                        <SmartLink
                          href="/about"
                          className="inline-flex items-center justify-center gap-2"
                        >
                          Learn More
                          <ArrowRight className="h-5 w-5" />
                        </SmartLink>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
