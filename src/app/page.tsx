'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const features = [
  { title: 'Complete Blueprint', desc: '26 chapters covering everything from token economics to production deployment' },
  { title: '1000+ Examples', desc: 'Real-world prompt patterns tested across GPT-4, Claude, Gemini, and more' },
  { title: '100+ Templates', desc: 'Ready-to-use prompt templates for every use case' },
  { title: '200+ Exercises', desc: 'Hands-on practice with answer keys and explanations' },
  { title: '50+ Mini Projects', desc: 'Build a portfolio of prompt engineering projects' },
  { title: '40+ Case Studies', desc: 'Learn from real production implementations' },
];

const roadmap = [
  { phase: 'Foundations', items: ['Understanding LLMs', 'Basic prompt structures', 'Token limits & costs', 'The Five Laws of Prompting'] },
  { phase: 'Core Techniques', items: ['Zero-shot & few-shot', 'Chain-of-thought', 'Role prompting', 'Prompt chaining'] },
  { phase: 'Advanced Patterns', items: ['Tree-of-thought', 'Self-consistency', 'ReAct agents', 'Autonomous agents'] },
  { phase: 'Production', items: ['Evaluation frameworks', 'Prompt versioning', 'Safety & alignment', 'Cost optimization'] },
];

export default function Home() {
  const [email, setEmail] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEmail('');
      alert('Thank you for subscribing!');
    } catch {
      window.open(
        `https://wa.me/917775990933?text=${encodeURIComponent('I want to subscribe to the newsletter — ' + email)}`,
        '_blank'
      );
    }
  };

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(47,123,245,0.12),transparent)] dark:bg-[radial-gradient(45%_40%_at_50%_60%,rgba(47,123,245,0.08),transparent)]" />
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-6">Now Available — Team Alum Publishing</Badge>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-blue-deep dark:text-white sm:text-6xl">
            The Definitive Guide to <em>Prompt Engineering</em>
          </h1>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Master the art and science of crafting AI prompts. From foundational
            techniques to advanced production patterns — everything you need to
            become a prompt engineering expert.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/purchase">
              <Button size="lg">Get Access</Button>
            </Link>
            <Link href="/book/catalog">
              <Button variant="outline" size="lg">Explore the Book</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="relative aspect-[3/4] max-w-xs mx-auto lg:mx-0 rounded-lg overflow-hidden shadow-strong">
              <Image
                src="/book-cover.png"
                alt="Prompt Engineering Blueprint cover"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <Badge variant="gold" className="mb-4">Foundation Edition v0.4.0</Badge>
              <h2 className="font-serif text-3xl font-bold text-blue-deep dark:text-white">
                Prompt Engineering Blueprint
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                This book distills thousands of hours of prompt engineering
                experience into a structured, actionable blueprint. From complete
                beginner to production-ready practitioner.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <Badge>26 Chapters</Badge>
                <Badge variant="gold">1000+ Examples</Badge>
                <Badge>100+ Templates</Badge>
                <Badge variant="success">Lifetime Updates</Badge>
              </div>
              <div className="flex gap-4 mt-8">
                <Link href="/purchase">
                  <Button>Get Access — from ₹199</Button>
                </Link>
                <Link href="/book/catalog">
                  <Button variant="outline">Read Preview</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8 bg-light-blue dark:bg-[#16213e]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="section-eyebrow"><span className="inline-block w-2 h-2 rounded-full bg-blue-bright mr-2" /> WHAT YOU GET</div>
            <h2 className="section-title dark:text-white">Everything Inside</h2>
            <p className="section-lead mx-auto">A comprehensive toolkit for mastering prompt engineering</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card hover:shadow-strong transition-shadow">
                <h3 className="font-serif text-lg font-semibold text-blue-deep dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="section-eyebrow"><span className="inline-block w-2 h-2 rounded-full bg-blue-bright mr-2" /> LEARNING PATH</div>
            <h2 className="section-title dark:text-white">Learning Roadmap</h2>
            <p className="section-lead mx-auto">A structured path from fundamentals to production</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {roadmap.map((phase) => (
              <div key={phase.phase} className="card card-gold">
                <h3 className="font-serif text-lg font-semibold text-blue-deep dark:text-white">{phase.phase}</h3>
                <ul className="mt-4 space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="mt-0.5 text-blue-bright shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8 bg-light-blue dark:bg-[#16213e]">
        <div className="mx-auto max-w-2xl text-center">
          <div className="section-eyebrow justify-center"><span className="inline-block w-2 h-2 rounded-full bg-blue-bright mr-2" /> STAY IN THE LOOP</div>
          <h2 className="section-title dark:text-white">Get Book Updates</h2>
          <p className="section-lead mx-auto">Prompt engineering tips, chapter releases, and exclusive discounts</p>
          <form onSubmit={handleSubscribe} className="mt-8 flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field flex-1"
            />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8 border-t border-blue-bright/10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="section-eyebrow justify-center">CONTACT</div>
          <h2 className="font-serif text-2xl font-bold text-blue-deep dark:text-white">Get in Touch</h2>
          <p className="mt-3 text-sm text-ink-soft">Have questions? Reach out to us directly.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <a href="https://wa.me/917775990933" target="_blank" rel="noopener noreferrer"
              className="card hover:shadow-strong transition-shadow text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="font-semibold text-blue-deep dark:text-white text-sm">WhatsApp</div>
              <div className="text-xs text-ink-soft mt-1">7775990933</div>
            </a>
            <a href="mailto:socialsudarshan8@gmail.com"
              className="card hover:shadow-strong transition-shadow text-center">
              <div className="text-2xl mb-2">📧</div>
              <div className="font-semibold text-blue-deep dark:text-white text-sm">Email</div>
              <div className="text-xs text-ink-soft mt-1 break-all">socialsudarshan8@gmail.com</div>
            </a>
            <a href="tel:+919822822448"
              className="card hover:shadow-strong transition-shadow text-center">
              <div className="text-2xl mb-2">📞</div>
              <div className="font-semibold text-blue-deep dark:text-white text-sm">Phone</div>
              <div className="text-xs text-ink-soft mt-1">9822822448</div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
