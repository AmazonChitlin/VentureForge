import Link from "next/link";

import { AuthNavigation } from "@/components/auth/auth-navigation";

export default function Home() {
  return (
    <main className="vf-home">
      <header>
        <div>
          <strong>VentureForge</strong>
          <span>Business Builder</span>
        </div>
        <AuthNavigation />
      </header>
      <section>
        <div>
          <p className="vf-section-label">A simpler way to start</p>
          <h1>Build your business one clear question at a time.</h1>
          <p>
            You do not need to know business terms. VentureForge turns your
            plain answers into a business profile, safer next steps, a launch
            checklist, a plan, and a starter website.
          </p>
          <div>
            <Link className="vf-button vf-button-primary" href="/project/new">
              Start your Business Builder
            </Link>
            <Link className="vf-button vf-button-secondary" href="/dashboard">
              Open project dashboard
            </Link>
            <span>Save your work and come back anytime.</span>
          </div>
        </div>
        <aside>
          <p>Your first few steps</p>
          <ol>
            <li><b>1</b><span><strong>Describe your idea</strong><small>Use your own words.</small></span></li>
            <li><b>2</b><span><strong>Picture your first customer</strong><small>We will help you narrow it down.</small></span></li>
            <li><b>3</b><span><strong>Estimate the basics</strong><small>Start with rough numbers.</small></span></li>
            <li><b>4</b><span><strong>Get your safest next steps</strong><small>Build proof before big spending.</small></span></li>
          </ol>
        </aside>
      </section>
      <footer>
        Planning support only. Verify legal, tax, licensing, and funding
        details with official agencies and qualified professionals.
      </footer>
    </main>
  );
}
