import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-foreground">Account data:</strong> Name, email address,
                profile photo (via authentication provider)
              </li>
              <li>
                <strong className="text-foreground">Fitness data:</strong> Workout logs, progress
                entries, body measurements, exercise preferences
              </li>
              <li>
                <strong className="text-foreground">Client data (trainers):</strong> Client names,
                contact info, training notes, workout assignments
              </li>
              <li>
                <strong className="text-foreground">AI interactions:</strong> Chat messages sent to
                the AI coaching feature
              </li>
              <li>
                <strong className="text-foreground">Contact form submissions:</strong> Name, email,
                and message content
              </li>
            </ul>
            <p className="mt-2">We also collect automatically:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Usage analytics (pages visited, features used)</li>
              <li>Device information and browser type</li>
              <li>IP address (for rate limiting and security)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and improve the Service</li>
              <li>To personalize your experience (e.g., AI-generated recommendations)</li>
              <li>To process payments (via Stripe)</li>
              <li>To send service-related notifications</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent abuse or security threats</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. AI Data Processing</h2>
            <p>
              Messages sent to the AI coaching feature are processed by third-party AI providers
              (Anthropic) to generate responses. We do not use your conversations to train AI
              models. AI-generated content (workout plans, meal plans, insights) is stored in your
              account for your convenience.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-foreground">Stripe:</strong> For payment processing
              </li>
              <li>
                <strong className="text-foreground">AI providers:</strong> For AI feature
                functionality (chat messages only)
              </li>
              <li>
                <strong className="text-foreground">Hosting provider:</strong> For infrastructure
                (data stored encrypted at rest)
              </li>
              <li>
                <strong className="text-foreground">Law enforcement:</strong> If required by law or
                to protect safety
              </li>
            </ul>
            <p className="mt-2">
              Trainers can view data for their own clients. Client data is scoped to the
              trainer-client relationship and is not visible to other trainers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where retention is required
              by law (e.g., payment records for tax purposes).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-foreground">Access:</strong> Request a copy of your personal
                data
              </li>
              <li>
                <strong className="text-foreground">Correction:</strong> Update inaccurate
                information
              </li>
              <li>
                <strong className="text-foreground">Deletion:</strong> Request deletion of your data
              </li>
              <li>
                <strong className="text-foreground">Portability:</strong> Export your data in a
                machine-readable format
              </li>
              <li>
                <strong className="text-foreground">Objection:</strong> Object to certain processing
                of your data
              </li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@gymgurus.com" className="text-primary hover:underline">
                privacy@gymgurus.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted connections
              (HTTPS), secure session management, rate limiting, CSRF protection, and input
              validation. However, no system is 100% secure. Please use strong, unique passwords for
              your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use
              third-party tracking cookies. Session cookies expire when you close your browser or
              after a period of inactivity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
            <p>
              The Service is not intended for users under 16 years of age. We do not knowingly
              collect personal information from children under 16.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on the Service. Continued use after changes
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us at{' '}
              <a href="mailto:privacy@gymgurus.com" className="text-primary hover:underline">
                privacy@gymgurus.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground flex gap-4">
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
