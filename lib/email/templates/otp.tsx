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
      <Head />
      <Preview>Your Axceal verification code is {code}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={contentSection}>
            <Text style={greeting}>
              <strong>Hi User,</strong>
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

export default OtpEmail;

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
  fontSize: "53.3px",
  fontWeight: "600",
  lineHeight: "1.4",
  letterSpacing: "-0.01em",
  margin: "0",
  textAlign: "center" as const,
};

const expireText = {
  color: "#aaaaaa",
  fontSize: "13.3px",
  textAlign: "center" as const,
  margin: "0 0 16px 0",
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
