import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using GymGurus ("Service"), you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>
              GymGurus is a fitness platform that provides tools for personal trainers and
              individuals including client management, workout planning, progress tracking, fitness
              calculators, and AI-powered coaching features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to provide accurate information and to update it as needed. You must be at
              least 16 years old to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Share your account credentials with others</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Upload malicious content or interfere with the Service</li>
              <li>
                Scrape, crawl, or use automated means to access the Service without permission
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Health Disclaimer</h2>
            <p>
              The Service provides fitness-related tools and AI-generated suggestions for
              informational purposes only. This is not medical advice. Always consult a qualified
              healthcare professional before starting any exercise program or making changes to your
              diet. GymGurus is not liable for any injuries, health issues, or damages arising from
              the use of information provided through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. AI Features</h2>
            <p>
              The Service includes AI-powered features (e.g., workout generation, meal plans,
              coaching chat). AI-generated content is provided as suggestions and may not be
              accurate or appropriate for your specific situation. You should always use your own
              judgment and consult professionals as needed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Intellectual Property</h2>
            <p>
              You retain ownership of any content you create using the Service (e.g., workout plans,
              client notes). GymGurus retains all rights to the Service, including its design, code,
              and branding.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Payments & Subscriptions</h2>
            <p>
              Certain features may require a paid subscription. Payments are processed securely
              through Stripe. Refund policies are described at the time of purchase. Subscriptions
              auto-renew unless cancelled before the renewal date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these Terms. You may delete
              your account at any time by contacting support. Upon termination, your data will be
              handled in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, GymGurus shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
              Our total liability shall not exceed the amount you paid for the Service in the 12
              months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by
              posting the updated Terms on the Service. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
              <a href="mailto:support@gymgurus.com" className="text-primary hover:underline">
                support@gymgurus.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground flex gap-4">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
