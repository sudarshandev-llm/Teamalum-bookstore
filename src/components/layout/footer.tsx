import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Book' },
  { href: '/purchase', label: 'Purchase' },
  { href: '/redeem', label: 'Redeem' },
  { href: '/about', label: 'About' },
];

const supportLinks = [
  {
    label: 'WhatsApp',
    href: `https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '917775990933').replace(/[^0-9]/g, '')}`,
    value: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '7775990933',
  },
  {
    label: 'Email',
    href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'socialsudarshan8@gmail.com'}`,
    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'socialsudarshan8@gmail.com',
  },
  {
    label: 'Phone',
    href: `tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE || '+919822822448'}`,
    value: process.env.NEXT_PUBLIC_CONTACT_PHONE || '9822822448',
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-blue-bright/10 bg-paper dark:bg-ink">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-blue-deep dark:text-white">
              Team Alum Publishing
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Publishing high-quality technical books to help developers and AI practitioners master their craft.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-blue-deep dark:text-gold">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-soft transition-colors hover:text-blue-deep dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-blue-deep dark:text-gold">
              Support
            </h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="block text-sm text-ink-soft transition-colors hover:text-blue-deep dark:hover:text-white"
                  >
                    <span className="font-medium text-ink dark:text-white">{link.label}:</span>{' '}
                    {link.value}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-blue-deep dark:text-gold">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-ink-soft transition-colors hover:text-blue-deep dark:hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-ink-soft transition-colors hover:text-blue-deep dark:hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-blue-bright/10 pt-6 dark:border-white/10">
          <p className="text-center text-xs text-ink-soft">
            &copy; {currentYear} Team Alum Publishing. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
