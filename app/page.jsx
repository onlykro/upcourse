'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Icon from '@/components/common/Icon';
import { getLatestDownload } from '@/lib/api';
import {
  listContainerVariants,
  listItemVariants,
  cardHoverVariants
} from '@/components/MotionVariants';

// =====================
// Data (unchanged)
// =====================
const features = [
  {
    icon: 'academic-cap',
    title: 'Personalized Assessment',
    description:
      'Take comprehensive assessments to discover your strengths, interests, and ideal career paths.'
  },
  {
    icon: 'bar-chart',
    title: 'Track Recommendations',
    description:
      'Get tailored recommendations for SHS tracks and strands based on your assessment results.'
  },
  {
    icon: 'book-open',
    title: 'College Program Mapping',
    description: 'Explore college programs aligned with your chosen track and career aspirations.'
  },
  {
    icon: 'users',
    title: 'Guided Learning',
    description: 'Access curated resources and quizzes to help you prepare for your chosen career path.'
  }
];

const testimonials = [
  {
    quote:
      "UpCourse helped me realize my passion for IT. The assessment accurately identified my skills and interests.",
    name: 'Juan Santos',
    role: 'Grade 12 STEM Student',
    track: 'STEM - IT Track'
  },
  {
    quote:
      'I was unsure about which strand to choose. UpCourse made the decision clear with its comprehensive guidance.',
    name: 'Maria Garcia',
    role: 'Grade 11 ABM Student',
    track: 'ABM - Business Management'
  },
  {
    quote:
      'The app is easy to use and provides valuable insights. Highly recommend to all senior high students!',
    name: 'Pedro Reyes',
    role: 'Grade 12 TVL Student',
    track: 'TVL - Computer Programming'
  }
];

const stats = [
  { value: '5,000+', label: 'Students Guided' },
  { value: '12', label: 'Tracks Covered' },
  { value: '50+', label: 'College Programs' },
  { value: '95%', label: 'Satisfaction Rate' }
];

// =====================
// Small helpers / components
// =====================
function CountUp({ value, duration = 1200, className = '' , startOnView = false}) {
  // value is a string: "5,000+" or "95%"
  const ref = useRef(null);
  const [display, setDisplay] = useState(value);
  const [started, setStarted] = useState(!startOnView);

  useEffect(() => {
    if (!started) return;
    const match = String(value).match(/[\d,]+/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const digits = match[0].replace(/,/g, '');
    const target = Number(digits);
    const suffix = value.replace(match[0], '');

    let start = 0;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const current = Math.floor(progress * target);
      // add commas
      const withComma = current.toLocaleString();
      setDisplay(withComma + suffix);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [value, duration, started]);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      });
    }, {threshold: 0.3});
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnView]);

  return <div ref={ref} className={className}>{display}</div>;
}

function useParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--mx', String(x));
      el.style.setProperty('--my', String(y));
    }

    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, []);
  return ref;
}

// Extra small utilities for enhanced UI
const GradientWord = ({ children }) => (
  <motion.span
    initial={{ y: 8, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.15, duration: 0.6 }}
    className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x font-extrabold"
  >
    {children}
  </motion.span>
);

const FloatingBadge = ({ icon = 'star', label }) => (
  <motion.div
    initial={{ y: 12, opacity: 0 }}
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border shadow-sm"
  >
    <Icon name={icon} size={16} />
    <span className="text-sm font-semibold">{label}</span>
  </motion.div>
);

// subtle floating decorative icons that orbit the phone mockup
function DecorativeOrbs() {
  return (
    <>
      <motion.div
        aria-hidden
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ rotate: 360, scale: 1, opacity: 0.9 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="pointer-events-none absolute -left-10 -top-8 w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl mix-blend-screen"
      />

      <motion.div
        aria-hidden
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ rotate: -360, scale: 1, opacity: 0.85 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        className="pointer-events-none absolute -right-12 bottom-6 w-20 h-20 rounded-full bg-gradient-to-r from-accent/10 to-primary/5 blur-2xl mix-blend-screen"
      />
    </>
  );
}

// =====================
// Enhanced HomePage
// =====================
export default function HomePage() {
  const [latestVersion, setLatestVersion] = useState(null);
  const [mounted, setMounted] = useState(false);
  const phoneRef = useRef(null);
  const controls = useAnimation();
  const birdControls = useAnimation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    getLatestDownload('stable').then(res => {
      if (res?.data) setLatestVersion(res.data);
    });

    // small entrance animation for illustrative purposes
    controls.start(i => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.5, ease: 'easeOut' }
    }));
  }, []);

  const parallaxRef = useParallax();

  // extra animation controls for hero micro-interactions
  const pulseControls = useAnimation();
  useEffect(() => {
    pulseControls.start({ scale: [1, 1.03, 1], transition: { duration: 2.8, repeat: Infinity } });
  }, []);

  // Bird intro -> idle sequence
  useEffect(() => {
    if (shouldReduceMotion) {
      // If user prefers reduced motion, simply show the bird statically slightly outside left
      birdControls.set({ opacity: 1, scale: 1.18, x: '-140%', y: -8 });
      return;
    }

    let mountedFlag = true;
    const run = async () => {
      // initial 'pop' from center -> swoop left outside phone
      // small delay so phone entrance feels cohesive
      await birdControls.start({
        opacity: [0, 1],
        // start smaller then pop a bit larger, then settle a tad
        scale: [0.45, 1.18, 1.06],
        x: ['0%', '-140%'],
        y: [6, -18],
        rotate: [-12, 0],
        transition: { duration: 0.95, ease: 'easeOut' }
      });

      if (!mountedFlag) return;

      // idle floating loop, anchored roughly at -140% x
      birdControls.start({
        x: '-140%',
        y: [-8, 4, -8],
        rotate: [-4, 4, -4],
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
      });
    };

    run();

    return () => { mountedFlag = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birdControls, shouldReduceMotion]);

  return (
    <div className="min-h-screen flex flex-col antialiased bg-gradient-to-b from-background via-background to-background">
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-20 pb-28 px-4 overflow-hidden">
          {/* Animated decorative blobs */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -left-44 -top-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-3xl mix-blend-screen"
          />

          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-32 bottom-8 w-80 h-80 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl mix-blend-screen"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          />

          {/* subtle particle overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="30" result="blur" />
                <feBlend in="SourceGraphic" in2="blur" />
              </filter>
            </defs>
            <g filter="url(#soft)" opacity="0.06">
              <circle cx="120" cy="80" r="8" fill="#7c3aed" />
              <circle cx="300" cy="120" r="6" fill="#06b6d4" />
              <circle cx="640" cy="40" r="10" fill="#f97316" />
            </g>
          </svg>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <motion.div
                  custom={0}
                  initial={{ opacity: 0, y: 24 }}
                  animate={controls}
                  className="max-w-3xl"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-black mb-6">
                    <Icon name="star" size={14} />
                    Career Guidance Made Easy
                  </span>

                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground tracking-tight leading-tight">
                    Discover Your Path to{' '}
                    <GradientWord>Success</GradientWord>
                  </h1>

                  <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl font-semibold">
                    UpCourse provides personalized career guidance for senior high school students at Marian College of Baliuag.
                    Students can take assessments, explore academic tracks, and plan their future with tailored recommendations.
                  </p>

                  <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      asChild
                      variant="playful"
                      size="lg"
                      className="min-w-[180px] rounded-2xl px-6 py-3 font-bold transform-gpu"
                    >
                      <Link href="/downloads" className="inline-flex items-center justify-center gap-2">
                        <Icon name="download" size={18} />
                        Download App
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="playfulOutline"
                      size="lg"
                      className="min-w-[180px] rounded-2xl px-6 py-3 font-bold bg-transparent border-2"
                    >
                      <Link href="/about" className="inline-flex items-center justify-center gap-2">
                        Learn More
                        <Icon name="arrow-right" size={18} />
                      </Link>
                    </Button>
                  </div>

                  {latestVersion && (
                    <p className="mt-4 text-sm text-muted-foreground font-medium">
                      Latest: <span className="font-black">v{latestVersion.version}</span>{' '}
                      <span className="text-muted-foreground">({latestVersion.size})</span>
                    </p>
                  )}

                  {/* quick badges */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border shadow-sm"
                    >
                      <Icon name="shield-check" size={16} />
                      <span className="text-sm font-semibold">For Marian College of Baliuag Senior High School Students</span>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border shadow-sm"
                    >
                      <Icon name="users" size={16} />
                      <span className="text-sm font-semibold">Community features</span>
                    </motion.div>

                    <div className="hidden sm:inline-flex">
                      <FloatingBadge icon="sparkles" label="Student-first" />
                    </div>

                  </div>
                </motion.div>
              </div>

              <div className="lg:col-span-5 relative">
                {/* Phone mockup with parallax */}
                <div ref={parallaxRef} className="mx-auto max-w-sm cursor-none" style={{ perspective: 1200 }}>
                  <motion.div
                    ref={phoneRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.12 }}
                    className="relative mx-auto max-w-sm transform-gpu"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="relative aspect-[9/19] bg-card rounded-[3rem] border-4 border-foreground/8 shadow-2xl overflow-hidden transform transition-transform will-change-transform"
                      style={{
                        // tilt based on CSS vars set by parallax
                        transform: 'rotateX(calc(var(--my) * 6deg)) rotateY(calc(var(--mx) * 10deg))'
                      }}
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-foreground/8 rounded-b-3xl" />
                      <div className="p-5 pt-9 h-full bg-gradient-to-b from-primary/20 to-background flex flex-col items-center justify-center gap-4">
                        <div className="w-18 h-18 flex items-center flex justify-center">
                          <Image
                            src="/logo.png"
                            alt="UpCourse logo"
                            width={64}
                            height={64}
                            className="object-contain"
                          />
                        </div>
                          <Image
                            src="/word.png"
                            alt="UpCourse logo"
                            width={128}
                            height={64}
                            className="object-contain"
                          />
                        <p className="text-sm text-muted-foreground font-semibold">Career Guidance App</p>

                        <div className="mt-6 w-full space-y-3 z-10">
                          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="h-12 rounded-xl bg-muted/60 flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center font-black">P</div>
                              <div className="text-sm font-semibold">Pre-Assessment</div>
                            </div>
                            <div className="text-xs font-black">Start</div>
                          </motion.div>

                          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="h-12 rounded-xl bg-muted/60 flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center font-black">R</div>
                              <div className="text-sm font-semibold">Recommended Programs</div>
                            </div>
                            <div className="text-xs font-black">Explore</div>
                          </motion.div>

                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="h-12 rounded-xl bg-primary/20 flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/40 flex items-center justify-center font-black">R</div>
                              <div className="text-sm font-semibold">Career Guide</div>
                            </div>
                            <div className="text-xs font-black">View</div>
                          </motion.div>
                        </div>
                      </div>

                      {/* subtle glow */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-20 rounded-full bg-gradient-to-t from-primary/8 to-transparent filter blur-2xl opacity-60" />

                        {/* orbiting small icons */}
                        <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
                          <Icon name="sparkles" size={14} />
                        </div>

                        <div className="absolute bottom-10 right-8 w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shadow-sm">
                          <Icon name="users" size={14} />
                        </div>

                      </div>
                    </div>

                    {/* bird animation: placed inside the phone container so it looks like it comes from the screen */}
                    {/* Put your bird image at /public/kwesto.png (src="/kwesto.png") */}
                    <motion.img
                      src="/kwesto.png"
                      alt="kwesto coming out of phone"
                      aria-hidden
                      initial={{ opacity: 0, scale: 0.45, x: '0%', y: 6, rotate: -12 }}
                      animate={birdControls}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 sm:w-44 pointer-events-none z-30"
                      style={{ filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.18))' }}
                    />

                    {/* floating badge */}
                    <motion.div animate={pulseControls} className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-primary px-4 py-2 text-primary-foreground font-black shadow-lg">New • v{latestVersion ? latestVersion.version : '—'}</div>
                    </motion.div>

                    <DecorativeOrbs />

                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative underline SVG */}
          <svg className="absolute left-0 right-0 bottom-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 30 C 360 90 1080 -30 1440 30 L1440 60 L0 60 Z" fill="rgba(99,102,241,0.03)" />
          </svg>

          {/* small style tweaks for parallax -- scoped */}
          <style>{` 
            /* create a subtle animating gradient for the "Success" word and blobs */
            @keyframes hueShift { from { filter: hue-rotate(0deg);} to { filter: hue-rotate(360deg);} }
            .bg-clip-text { background-size: 200% 200%; animation: hueShift 8s linear infinite; }

            /* gradient move */
            @keyframes gradientX { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            .animate-gradient-x { animation: gradientX 6s ease infinite; }

            /* allow our parallax to write css vars -- default to 0 */
            [style] { --mx: 0; --my: 0; }

            /* subtle cursor trail */
            .cursor-trail::after { content: ''; position: fixed; pointer-events: none; width: 80px; height: 80px; border-radius: 999px; mix-blend-mode: overlay; background: radial-gradient(circle at center, rgba(99,102,241,0.12), transparent 40%); transform: translate(-50%,-50%); z-index: 60; }
          `}</style>
        </section>

        {/* Stats Section */}
        <section className="py-14 px-4 bg-muted/50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="text-center p-6 rounded-4xl bg-card border border-border shadow-sm"
                >
                  <div className="mx-auto w-20 h-20 rounded-4xl bg-primary/5 flex items-center justify-center text-2xl sm:text-3xl font-black text-primary">
                    <CountUp value={stat.value} startOnView className="text-2xl sm:text-3xl" />
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground font-semibold">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto font-semibold">
                UpCourse provides comprehensive tools and resources to help you make
                informed decisions about your future.
              </p>
            </motion.div>

            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  variants={listItemVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="p-6 rounded-4xl bg-card border border-border hover:border-primary/50 hover:shadow-xl transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm">
                    <Icon name={feature.icon} size={22} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-black text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-semibold">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">
                What Students Say
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-semibold">
                Hear from students who have used UpCourse to guide their career journey.
              </p>
            </motion.div>

            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              {testimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.name}
                  variants={listItemVariants}
                  className="p-6 rounded-4xl bg-card border border-border shadow-md"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Icon key={i} name="star-filled" size={16} className="text-warning" />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed mb-6 font-semibold">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-black text-primary">
                        {testimonial.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-black text-foreground text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground font-semibold">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section (unchanged structure but more dynamic) */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-8 sm:p-12 rounded-4xl bg-primary text-primary-foreground shadow-xl"
            >
              <h2 className="text-3xl sm:text-4xl font-black">
                Ready to Discover Your Future?
              </h2>
              <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto font-semibold">
                Download UpCourse today and take the first step towards a career that
                matches your passions and abilities.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="min-w-[200px] rounded-2xl px-6 py-3 font-black shadow-lg"
                >
                  <Link href="/downloads" className="inline-flex items-center gap-2">
                    <Icon name="download" size={18} />
                    Get Started Free
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] rounded-2xl px-6 py-3 font-black bg-transparent border-2 border-primary-foreground/30 hover:bg-primary-foreground/10"
                >
                  <Link href="/contact" className="inline-flex items-center gap-2">
                    Contact Us
                    <Icon name="arrow-right" size={18} />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
