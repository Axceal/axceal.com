import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Img,
  Link,
} from "@react-email/components";
import * as React from "react";

type WaitlistEmailProps = { position: number };

export function WaitlistJoinedEmail({ position }: WaitlistEmailProps) {
  const positionLabel = `#${position.toLocaleString("en-IN")}`;
  
  return (
    <Html>
      <Head />
      <Preview>You&apos;re in the Aero queue at {positionLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={contentSection}>
            <Text style={greeting}>
              <strong>Hi User,</strong>
            </Text>
            <Text style={text}>
              Thanks for joining the waitlist for Aero. We&apos;ll be in touch when it&apos;s your turn to order.
            </Text>

            <Section style={codeContainer}>
              <Text style={codeText}>{positionLabel}</Text>
            </Section>

            <Text style={text}>
              Keep an eye on this inbox — we&apos;ll send the invite from this address.
            </Text>

            <Text style={text}>
              If you have any questions, contact our support team at <Link href="mailto:contact@axceal.com" style={link}>contact@axceal.com</Link>.
            </Text>

            <Text style={text}>
              Thanks, Axceal
            </Text>
          </Section>

          <Section style={footer}>
            <Img 
              src="https://ljnfarynjpnrbrwmesjombj9terggazvam5gufvfasa.canva-cdn.email/7a7a6d3b9c12ef03a8a4c0ae3fa9d0f7.png" 
              width="56" 
              height="35" 
              alt="Axceal" 
              style={logo}
            />
            <Text style={footerText}>
              © 2026 Axceal (Aectex Technologies Private Limited)<br />
              All rights reserved
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WaitlistJoinedEmail;

const main = {
  backgroundColor: "#f0f1f5",
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: "0",
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
};

const contentSection = {
  padding: "24px",
};

const greeting = {
  color: "#aaaaaa",
  fontSize: "13.3px",
  lineHeight: "17.9px",
  margin: "0 0 16px 0",
};

const text = {
  color: "#aaaaaa",
  fontSize: "13.3px",
  lineHeight: "17.9px",
  margin: "0 0 16px 0",
};

const codeContainer = {
  padding: "40px 0",
  textAlign: "center" as const,
};

const codeText = {
  color: "#121212",
  fontSize: "42.3px",
  fontWeight: "600",
  lineHeight: "1.4",
  letterSpacing: "-0.01em",
  margin: "0",
  textAlign: "center" as const,
};

const link = {
  color: "#aaaaaa",
  textDecoration: "none",
};

const footer = {
  backgroundColor: "#0000f4",
  padding: "16px",
  textAlign: "center" as const,
};

const logo = {
  display: "block",
  margin: "0 auto 16px auto",
};

const footerText = {
  color: "#ffffff",
  fontSize: "10.7px",
  lineHeight: "1.4",
  margin: "0",
  textAlign: "center" as const,
};
