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

type WaitlistEmailProps = { position: number };

// W8 — sent once when the user is added to the queue. Plain confirmation
// + position number. No CTA — the launch invite mail is a separate batch.
export function WaitlistJoinedEmail({ position }: WaitlistEmailProps) {
  const positionLabel = `#${position.toLocaleString("en-IN")}`;
  return (
    <Html>
      <Head />
      <Preview>You&apos;re in the Aero queue at {positionLabel}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>You&apos;re in the queue</Heading>
          <Text style={paragraph}>
            Thanks for joining the waitlist for Aero. We&apos;ll be in touch
            when it&apos;s your turn to order.
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{positionLabel}</Text>
          </Section>
          <Text style={footer}>
            Keep an eye on this inbox — we&apos;ll send the invite from this
            address.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WaitlistJoinedEmail;

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
  letterSpacing: "0.05em",
  margin: 0,
};
const footer: React.CSSProperties = {
  color: "#aaaaaa",
  fontSize: 13,
  marginTop: 24,
};
