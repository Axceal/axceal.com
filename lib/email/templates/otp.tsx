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

type OtpEmailProps = { code: string };

export function OtpEmail({ code = "0000" }: OtpEmailProps) {
  const spacedCode = code.split('').join('   ');
  
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Your Axceal verification code is {code}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={contentSection}>
            <Img
              src="https://axceal.com/assets/email-logo-header.png"
              width="57"
              height="57"
              alt="Axceal"
              style={topLogo}
            />
            <Text style={greeting}>
              <strong>Hi,</strong>
            </Text>
            <Text style={text}>
              To complete your authentication, please enter the following verification code:
            </Text>

            <Section style={codeContainer}>
              <Text style={codeText}>{spacedCode}</Text>
            </Section>

            <Text style={expireText}>
              <strong>T</strong>his code will expire in 180 Seconds, better be quick with it!
            </Text>

            <Text style={text}>
              If you did not request this code, please ignore this email or contact our support team immediately at <Link href="mailto:contact@axceal.com" style={link}>contact@axceal.com</Link> to secure your account.
            </Text>

            <Text style={text}>
              Thanks, Axceal
            </Text>
          </Section>

          <Section style={footer}>
            <Img 
              src="https://axceal.com/assets/email-logo-footer.png" 
              width="33" 
              height="21" 
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

export default OtpEmail;

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
  margin: "0 0 16px 0",
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
  fontSize: "53.3px",
  fontWeight: "600",
  lineHeight: "1.4",
  letterSpacing: "-0.01em",
  margin: "0",
  textAlign: "center" as const,
};

const expireText = {
  color: "#121212",
  fontSize: "13.3px",
  textAlign: "center" as const,
  margin: "0 0 16px 0",
};

const link = {
  color: "#121212",
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
