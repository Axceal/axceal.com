import Link from "next/link";
import { SvgText } from "../components/text/SvgText";
import { HomeFooter } from "../components/home/HomeFooter";
import { ExpandableSection } from "../components/layout/ExpandableSection";
import { AxcealLogo } from "../components/icons/brand/AxcealLogo";

export default function TermsAndConditions() {
    return (
        <main className="relative flex-1 flex flex-col items-center pt-12 pb-[120px] px-4 sm:px-8 min-h-screen">
            <div className="w-full max-w-[500px] flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center shrink-0">
                        <SvgText text="Back" weight="600" height={16} className="text-[#0000f4]" />
                    </Link>
                    <div className="w-[8px] h-[8px] rounded-full bg-[#aaaaaa]" aria-hidden />
                    <div className="flex items-center justify-center w-[52px] h-[52px] rounded-full bg-[#0000f4] shrink-0">
                        <AxcealLogo className="text-white h-[18px] w-[27px]" />
                    </div>
                    <SvgText text="Terms & Conditions" weight="600" height={20} className="text-[#1e1e1e]" />
                </div>

                <div className="flex flex-col gap-2 w-full">

                    <ExpandableSection title="Account Registration">
                        <SvgText as="p" align="justify" text="To use certain features of our service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process (including your name, email, and phone number) and to update such information to keep it accurate." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Account Security">
                        <SvgText as="p" align="justify" text="You are responsible for safeguarding the password that you use to access your Axceal account. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Acceptable Use">
                        <SvgText as="p" align="justify" text="You agree to use our services only for lawful purposes. You must not use the website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of the service." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Intellectual Property">
                        <SvgText as="p" align="justify" text="All content, branding, trademarks, software, and intellectual property on this website are the property of Axceal. You may not reproduce, distribute, or create derivative works from any part of our service without explicit written permission." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Limitation of Liability">
                        <SvgText as="p" align="justify" text='Axceal provides its services "as is." While we strive for maximum uptime and security, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the service.' height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Governing Law">
                        <SvgText as="p" align="justify" text="These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any legal actions or disputes shall be resolved exclusively in the courts located in India." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Changes to Terms">
                        <SvgText as="p" align="justify" text="We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes by updating the date at the top of this page or by sending an email to our registered users." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>
                </div>
            </div>
            <HomeFooter section={2} />
        </main>
    );
}
