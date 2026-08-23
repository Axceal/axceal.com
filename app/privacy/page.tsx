import Link from "next/link";
import { SvgText } from "../components/text/SvgText";
import { HomeFooter } from "../components/home/HomeFooter";
import { ExpandableSection } from "../components/layout/ExpandableSection";
import { AxcealLogo } from "../components/icons/brand/AxcealLogo";

export default function PrivacyPolicy() {
    return (
        <main className="relative flex-1 flex flex-col items-center pt-12 pb-[120px] px-4 sm:px-8 min-h-screen">
            <div className="w-full max-w-[500px] flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center shrink-0 hover:opacity-80 transition-opacity">
                        <SvgText text="Back" weight="600" height={16} className="text-[#0000f4]" maxWidth={100} />
                    </Link>
                    <div className="w-[8px] h-[8px] rounded-full bg-[#aaaaaa]" aria-hidden />
                    <div className="flex items-center justify-center w-[52px] h-[52px] rounded-full bg-[#0000f4] shrink-0">
                        <AxcealLogo className="text-white h-[18px] w-[27px]" />
                    </div>
                    <SvgText text="Privacy Policy" weight="600" height={20} className="text-[#1e1e1e]" />
                </div>

                <div className="flex flex-col gap-2 w-full">

                    <ExpandableSection title="Information We Collect">
                        <SvgText as="p" align="justify" text="To provide you with our services, we collect the following personal information when you register an account:" height={14} weight="500" className="text-[#aaaaaa]" />
                        <div className="flex flex-col gap-2 pl-4 w-full">
                            <SvgText as="p" align="justify" text="- Identity Data: First and last name, date of birth, and gender." height={14} weight="500" className="text-[#aaaaaa]" />
                            <SvgText as="p" align="justify" text="- Contact Data: Email address and phone number." height={14} weight="500" className="text-[#aaaaaa]" />
                            <SvgText as="p" align="justify" text="- Security Data: Passwords (securely hashed and encrypted; we never store plain-text passwords)." height={14} weight="500" className="text-[#aaaaaa]" />
                        </div>
                    </ExpandableSection>

                    <ExpandableSection title="How We Use Your Data">
                        <SvgText as="p" align="justify" text="The sole purpose of collecting this data is to serve you. We use your information exclusively to:" height={14} weight="500" className="text-[#aaaaaa]" />
                        <div className="flex flex-col gap-2 pl-4 w-full">
                            <SvgText as="p" align="justify" text="- Create and manage your user account." height={14} weight="500" className="text-[#aaaaaa]" />
                            <SvgText as="p" align="justify" text="- Provide, operate, and maintain our services." height={14} weight="500" className="text-[#aaaaaa]" />
                            <SvgText as="p" align="justify" text="- Communicate with you regarding account updates, security notices, or customer support." height={14} weight="500" className="text-[#aaaaaa]" />
                        </div>
                    </ExpandableSection>

                    <ExpandableSection title="Data Storage and Security">
                        <SvgText as="p" align="justify" text="Your personal information is securely stored in our databases located in Singapore. We implement industry-standard security measures to protect your data from unauthorized access, alteration, disclosure, or destruction." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Zero Data Sharing Policy">
                        <SvgText as="p" align="justify" text="Your privacy is our priority. We do not share, sell, rent, or trade your personal data with any third parties, outside vendors, or advertisers. Your data remains strictly within Axceal for the sole purpose of providing our services to you." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>

                    <ExpandableSection title="Your Rights">
                        <SvgText as="p" align="justify" text="Depending on your location, you have the right to:" height={14} weight="500" className="text-[#aaaaaa]" />
                        <div className="flex flex-col gap-2 pl-4 w-full">
                            <SvgText as="p" align="justify" text="- Access the personal data we hold about you." height={14} weight="500" className="text-[#aaaaaa]" />
                            <SvgText as="p" align="justify" text="- Request corrections to any inaccurate or incomplete data." height={14} weight="500" className="text-[#aaaaaa]" />
                            <SvgText as="p" text="- Request the deletion of your account and associated personal data." height={14} weight="500" className="text-[#aaaaaa]" />
                        </div>
                        <SvgText as="p" text="To exercise any of these rights, please contact us at contact@axceal.com." height={14} weight="500" className="text-[#aaaaaa]" />
                    </ExpandableSection>
                </div>
            </div>
            <HomeFooter section={2} />
        </main>
    );
}
