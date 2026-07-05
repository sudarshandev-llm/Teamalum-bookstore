"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getWhatsAppLink, formatPrice, cn } from "@/lib/utils";
import { useState } from "react";

interface Plan {
  key: "1M" | "3M" | "LT";
  name: string;
  duration: string;
  price: number;
  icon: string;
  description: string;
  popular?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    key: "1M",
    name: "Starter",
    duration: "1 Month",
    price: 199,
    icon: "📖",
    description:
      "Full access for one month. Perfect for trying out the book and completing the core curriculum.",
  },
  {
    key: "3M",
    name: "Popular",
    duration: "3 Months",
    price: 399,
    icon: "🚀",
    description:
      "Three months of access with all updates. Best value for most learners.",
    popular: true,
  },
  {
    key: "LT",
    name: "Lifetime",
    duration: "Lifetime",
    price: 999,
    icon: "👑",
    description:
      "One-time payment for permanent access, including all future editions and updates.",
    badge: "Launch Offer",
  },
];

const faqs = [
  {
    q: "How will I receive the license?",
    a: "After your payment is confirmed, your license code will be sent instantly via WhatsApp along with instructions to access the book.",
  },
  {
    q: "How long does activation take?",
    a: "Activation is immediate after payment confirmation. You'll receive your access details within a few minutes on WhatsApp.",
  },
  {
    q: "Can I use the book on multiple devices?",
    a: "Yes! Your license works on up to 3 devices simultaneously — phone, tablet, and laptop.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 7-day money-back guarantee. If you're not satisfied, contact us and we'll process your refund.",
  },
  {
    q: "Is there any support if I get stuck?",
    a: "Absolutely. You can reach us via WhatsApp or email anytime. We typically respond within a few hours.",
  },
];

const trustItems = [
  {
    title: "Trusted by 500+ Learners",
    desc: "Join a growing community of professionals and students who have transformed their AI skills.",
  },
  {
    title: "Instant Delivery",
    desc: "Get your license code on WhatsApp immediately after payment — no waiting around.",
  },
  {
    title: "Lifetime Updates",
    desc: "We continuously update the book as the field evolves. Your license covers all future editions.",
  },
  {
    title: "7-Day Refund Guarantee",
    desc: "Not happy? We'll refund your purchase within 7 days, no questions asked.",
  },
];

export default function PurchasePage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-6">
            Choose Your Plan
          </Badge>
          <h1 className="font-serif text-4xl font-bold text-blue-deep dark:text-white sm:text-5xl">
            Get Your Copy Today
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft dark:text-white/60">
            Pick the access plan that suits you best. All plans include the full
            Prompt Engineering Blueprint content.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-20 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={cn(
                "card relative flex flex-col",
                plan.popular && "card-gold",
                plan.key === "LT" && "card-blue"
              )}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 right-4 bg-gold text-white dark:text-white">
                  {plan.badge}
                </Badge>
              )}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{plan.icon}</span>
                <div>
                  <h3 className="font-serif text-xl font-bold text-blue-deep dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="font-mono text-xs text-ink-soft dark:text-white/50">
                    {plan.duration}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft dark:text-white/70">
                {plan.description}
              </p>
              <div className="mt-6">
                <span className="font-serif text-4xl font-bold text-blue-deep dark:text-white">
                  {formatPrice(plan.price)}
                </span>
              </div>
              <div className="mt-auto pt-6">
                <Button
                  variant={plan.popular ? "primary" : "secondary"}
                  className="w-full"
                  onClick={() => setSelectedPlan(plan)}
                >
                  Get Access
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-3xl">
                📘
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-blue-deep dark:text-white">
                  {selectedPlan.name} Plan
                </h3>
                <p className="font-mono text-xs text-ink-soft dark:text-white/50">
                  {selectedPlan.duration}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <span className="font-serif text-2xl font-bold text-blue-deep dark:text-white">
                {formatPrice(selectedPlan.price)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft dark:text-white/70">
              You are about to purchase the{" "}
              <strong className="text-blue-deep dark:text-white">
                {selectedPlan.name}
              </strong>{" "}
              plan. Click below to continue on WhatsApp and complete your
              payment.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setSelectedPlan(null)}
              >
                Cancel
              </Button>
              <Button
                variant="whatsapp"
                className="flex-1"
                onClick={() => {
                  const msg = getWhatsAppLink(
                    selectedPlan.name,
                    selectedPlan.duration,
                    selectedPlan.price
                  );
                  window.open(msg, "_blank");
                  setSelectedPlan(null);
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Continue on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <section className="px-6 py-20 lg:px-8 bg-muted/50">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="section-eyebrow">FAQ</h2>
            <p className="section-title">Frequently Asked Questions</p>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="section-eyebrow">Why Buy From Team Alum</h2>
            <p className="section-title">Trusted by Learners Worldwide</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="card"
              >
                <h3 className="font-serif text-lg font-bold text-blue-deep dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft dark:text-white/70">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 py-16 lg:px-8 border-t border-blue-bright/10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl font-bold text-blue-deep dark:text-white">
            Still Have Questions?
          </h2>
          <p className="mt-3 text-sm text-ink-soft dark:text-white/60">
            Reach out to us directly and we&apos;ll help you out.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <a
              href="https://wa.me/917775990933"
              target="_blank"
              rel="noopener noreferrer"
              className="card transition-colors hover:border-whatsapp/50"
            >
              <div className="font-serif font-bold text-blue-deep dark:text-white">
                WhatsApp
              </div>
              <div className="mt-1 font-mono text-xs text-ink-soft dark:text-white/50">
                7775990933
              </div>
            </a>
            <a
              href="mailto:socialsudarshan8@gmail.com"
              className="card transition-colors hover:border-blue-bright/50"
            >
              <div className="font-serif font-bold text-blue-deep dark:text-white">
                Email
              </div>
              <div className="mt-1 break-all font-mono text-xs text-ink-soft dark:text-white/50">
                socialsudarshan8@gmail.com
              </div>
            </a>
            <a
              href="tel:+919822822448"
              className="card transition-colors hover:border-blue-bright/50"
            >
              <div className="font-serif font-bold text-blue-deep dark:text-white">
                Phone
              </div>
              <div className="mt-1 font-mono text-xs text-ink-soft dark:text-white/50">
                9822822448
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-bold text-blue-deep dark:text-white">
          {question}
        </h3>
        <span
          className={cn(
            "text-blue-bright transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {open && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft dark:text-white/70">
          {answer}
        </p>
      )}
    </div>
  );
}
