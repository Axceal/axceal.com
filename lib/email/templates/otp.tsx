import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type OtpEmailProps = { code: string };

export function OtpEmail({ code }: OtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Axceal verification code is {code}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Verify your email</Heading>
          <Text style={paragraph}>
            Use the code below to finish creating your Axceal account. It expires in 10 minutes.
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={footer}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OtpEmail;

const body: React.CSSProperties = {
  backgroundColor: "#f1f1f1",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  margin: 0,
  padding: "40px 0",
};
const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 20,
  margin: "0 auto",
  maxWidth: 480,
  padding: 32,
};
const heading: React.CSSProperties = {
  color: "#1e1e1e",
  fontSize: 22,
  fontWeight: 600,
  margin: 0,
};
const paragraph: React.CSSProperties = {
  color: "#1e1e1e",
  fontSize: 15,
  lineHeight: 1.5,
  marginTop: 16,
};
const codeBox: React.CSSProperties = {
  backgroundColor: "#f1f1f1",
  borderRadius: 12,
  margin: "24px 0",
  padding: "20px 0",
  textAlign: "center",
};
const codeText: React.CSSProperties = {
  color: "#0000f4",
  fontSize: 36,
  fontWeight: 700,
  letterSpacing: "0.4em",
  margin: 0,
};
const footer: React.CSSProperties = {
  color: "#aaaaaa",
  fontSize: 13,
  marginTop: 24,
};
