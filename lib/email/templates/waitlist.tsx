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
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

type WaitlistEmailProps = { position: number };

export function WaitlistJoinedEmail({ position }: WaitlistEmailProps) {
  const positionLabel = `#${position.toLocaleString("en-IN")}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>You&apos;re in the Aero queue at {positionLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={contentSection}>
            <Img
              src="https://axceal.com/assets/email-logo-header.png"
              width="56"
              height="56"
              alt="Axceal"
              style={topLogo}
            />
            <br />
            <Text style={greeting}>
              Hi,
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
            <Row>
              <Column style={{ width: "32px", paddingRight: "16px" }}>
                <Img
                  src="https://axceal.com/assets/email-logo-footer.png"
                  width="33"
                  height="21"
                  alt="Axceal"
                  style={logo}
                />
              </Column>
              <Column>
                <Text style={footerText}>
                  © 2026 Axceal (Aectex Technologies Private Limited)<br />
                  All rights reserved
                </Text>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WaitlistJoinedEmail;

const main = {
  backgroundColor: "#f0f1f5",
  fontFamily: '"Helvetica Now", Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "40px 0",
};

const container = {
  backgroundColor: "#f1f1f1",
  margin: "0 auto",
  maxWidth: "600px",
};

const contentSection = {
  padding: "24px",
};

const topLogo = {
  display: "block",
  margin: "0 auto 16px auto",
};

const greeting = {
  color: "#121212",
  fontSize: "13.3px",
  lineHeight: "17.9px",
  margin: "0 0 16px 0",
};

const text = {
  color: "#121212",
  fontSize: "13.3px",
  lineHeight: "17.9px",
  margin: "0 0 16px 0",
};

const codeContainer = {
  backgroundColor: "#f1f1f1",
  borderRadius: "100px",
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
  color: "#121212",
  textDecoration: "none",
};

const footer = {
  backgroundColor: "#0000f4",
  padding: "16px",
};

const logo = {
  display: "block",
  margin: "0",
};

const footerText = {
  color: "#ffffff",
  fontSize: "10.7px",
  lineHeight: "1.4",
  margin: "0",
  textAlign: "left" as const,
};
