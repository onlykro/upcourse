'use client';

import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Icon from '@/components/common/Icon';
import { listContainerVariants, listItemVariants } from '@/components/MotionVariants';

const team = [
  {
    name: 'Paul John Cabance',
    role: 'Capstone Advisor',
    bio: 'Provides guidance and oversight to ensure the project meets academic standards.',
    profile_pic: '/icon.png', // replace with actual image path
    overlay_pic: '/icon.png'
  },
  {
    name: 'Mikhaela Ayesha D.C. Espiritu',
    role: 'Project Manager',
    bio: 'Oversees project development and ensures timely delivery of milestones.',
    profile_pic: '/icon.png',
    overlay_pic: '/icon.png'
  },
  {
    name: 'Deiniel Ellie Guevarra',
    role: 'Web Developer',
    bio: 'Front-end developer specializing in creating responsive and user-friendly web applications.',
    profile_pic: '/icon.png',
    overlay_pic: '/icon.png'
  },
  {
    name: 'Macy M. Nishimura',
    role: 'Mobile Developer',
    bio: 'Mobile app developer focused on building intuitive and engaging applications for Android platform',
    profile_pic: '/icon.png',
    overlay_pic: '/icon.png'
  }
];

const timeline = [
  {
    year: '2024',
    title: 'Project Inception',
    description: 'UpCourse was conceptualized to address the need for personalized career guidance in Philippine senior high schools.'
  },
  {
    year: '2025 Q1',
    title: 'Development Phase',
    description: 'Core features including assessments and track recommendations were developed and tested.'
  },
  {
    year: '2025 Q4',
    title: 'Beta Launch',
    description: 'Released alpha version for testing and feedback collection.'
  },
  {
    year: '2026',
    title: 'First Release',
    description: 'A public release with updated features, dashboard, and ongoing support.'
  }
];

const values = [
  {
    icon: 'users',
    title: 'Student-Centered',
    description: 'Every feature is designed with the student\'s success in mind.'
  },
  {
    icon: 'shield',
    title: 'Data Privacy',
    description: 'We protect student data with industry-standard security measures.'
  },
  {
    icon: 'book-open',
    title: 'Evidence-Based',
    description: 'Our assessments are grounded in educational research and best practices.'
  },
  {
    icon: 'activity',
    title: 'Continuous Improvement',
    description: 'We update our app based on user and professional feedback.'
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
                About UpCourse
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                We are on a mission to empower Filipino senior high school students 
                with the tools and guidance they need to make informed career decisions.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-foreground mb-6">
                  Our Mission
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  UpCourse exists to bridge the gap between senior high school education 
                  and career readiness. We believe every student deserves access to quality 
                  career guidance, regardless of their school&apos;s resources.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Through our mobile application, we provide personalized assessments, 
                  track recommendations, and educational resources that help students 
                  discover their strengths and align them with suitable career paths.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We work closely with educators, guidance counselors, and industry 
                  professionals to ensure our platform reflects the latest educational 
                  standards and labor market trends.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-4"
              >
                {values.map((value) => (
                  <div 
                    key={value.title}
                    className="p-6 rounded-2xl bg-card border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon name={value.icon} size={20} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-foreground">
                How UpCourse Works
              </h2>
              <p className="mt-4 text-muted-foreground">
                A simple three-step process to discover your ideal career path.
              </p>
            </motion.div>

            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-8"
            >
              {[
                {
                  step: '01',
                  title: 'Take the Assessment',
                  description: 'Complete our comprehensive assessment that evaluates your interests, skills, personality traits, and academic strengths.'
                },
                {
                  step: '02',
                  title: 'Review Your Results',
                  description: 'Receive personalized recommendations for SHS tracks, strands, and college programs that align with your profile.'
                },
                {
                  step: '03',
                  title: 'Explore & Learn',
                  description: 'Access curated resources, take practice quizzes, and learn more about your recommended career paths.'
                }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  variants={listItemVariants}
                  className="flex gap-6 items-start"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-foreground">
                Our Journey
              </h2>
              <p className="mt-4 text-muted-foreground">
                The roadmap of UpCourse development.
              </p>
            </motion.div>

            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative"
            >
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border md:left-1/2 md:-translate-x-1/2" />
              
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  variants={listItemVariants}
                  className={`relative flex gap-6 mb-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Circle */}
                  <div className="absolute left-4 w-4 h-4 rounded-full bg-primary border-4 border-background md:left-1/2 md:-translate-x-1/2 z-10" />
                  
                  {/* Content */}
                  <div className={`ml-12 md:ml-0 md:w-1/2 ${
                    index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'
                  }`}>
                    <span className="text-sm font-bold text-primary">
                      {item.year}
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-1">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-foreground">
                Meet Our Team
              </h2>
              <p className="mt-4 text-muted-foreground">
                Dedicated professionals working to empower student success.
              </p>
            </motion.div>

            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {team.map((member) => (
                <motion.div
                  key={member.name}
                  variants={listItemVariants}
                  className="p-6 rounded-4xl bg-card border border-border text-center"
                >
                  <div className="w-20 h-20 mx-auto relative">
                    <img 
                      src={member.profile_pic} 
                      alt={member.name} 
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    {member.overlay_pic && (
                      <img
                        src={member.overlay_pic}
                        alt="overlay"
                        className="absolute top-0 right-0 w-8 h-8 rounded-full object-cover border-2 border-card"
                      />
                    )}
                  </div>
                  <h3 className="font-bold text-foreground">
                    {member.name}
                  </h3>
                  <p className="text-sm text-primary mt-1">
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    {member.bio}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
