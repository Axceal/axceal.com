import Link from "next/link";

// Server-rendered, visually hidden mirror of the homepage copy.
//
// The visible homepage renders all text as SVG (SvgText) inside a client
// subtree that sits behind a Suspense boundary (fallback=null), so the raw
// HTML served to crawlers / ad reviewers (X, Google, etc.) contains no
// readable text or legal links. This block ships that same copy as real
// semantic HTML in the initial response. Content MUST stay in sync with the
// visible SvgText strings in MobileHome / AeroSection / WhatCanAeroSection —
// hidden text that differs from what users see is treated as cloaking.
export function HomeSeoContent() {
  return (
    <div className="sr-only">
      <h1>Aero x1 by Axceal</h1>
      <p>Be unconstrained in all you do. Do more, be frictionless.</p>

      <section>
        <h2>What can Aero do</h2>
        <h3>Multi dimensional Cues</h3>
        <p>Up to Milli-second Cues latency.</p>
        <h3>All axis anchor navigation</h3>
        <p>Up to Micro-second navigation latency. Up to Milli-second Wrap Rate.</p>
        <h3>Surround Sense</h3>
        <p>Receive multi dimensional updates for Cues. Omni-Fit have on Softech design.</p>
        <h3>90g on your Palm</h3>
        <p>Light Aluminum and glass build. IP68 water, dust rating and IK06 impact rating.</p>
        <h3>Up to 23hr Battery Life</h3>
        <p>25W Type-C charging.</p>
      </section>

      <section>
        <h2>What&apos;s inside the Box</h2>
        <ul>
          <li>Aero x1</li>
          <li>Dock-C Cable</li>
        </ul>
      </section>

      <p>
        <Link href="/auth?from=order">Join Queue</Link>
      </p>

      <p>
        # Specific performance numbers may vary as Aero is still under
        development and evaluation.
      </p>

      <footer>
        <p>Axceal. All intellectual property belongs to Aectex Technologies Pvt. Ltd.</p>
        <p>
          Contact: <a href="mailto:contact@axceal.com">contact@axceal.com</a> |{" "}
          <a href="tel:+918830261513">+91 88302-61513</a>
        </p>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy Policy</Link>{" "}
          <Link href="/terms">Terms &amp; Conditions</Link>
        </nav>
      </footer>
    </div>
  );
}
