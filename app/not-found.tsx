import Link from "next/link";
import { SvgText } from "./components/text/SvgText";

export default function NotFound() {
    return (
        <main className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
            <img src="/assets/error%20svg.svg" alt="Error" className="w-[24px] h-[24px]" />
            
            <Link
                href="/"
                className="bg-[#f1f1f1] rounded-full px-[20px] py-3 flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none"
            >
                <SvgText text="Wrong Landing," weight="600" height={14} className="text-[#1e1e1e]" />
                <SvgText text="back to Home" weight="600" height={14} className="text-[#0000f4]" />
            </Link>
        </main>
    );
}
