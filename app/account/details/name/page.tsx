"use client";
import { SvgText } from "../../../components/SvgText";
import { SvgInput } from "../../../components/SvgInput";
import { useAccountDetails } from "../_context";

export default function NamePage() {
    const { firstName, setFirstName, lastName, setLastName } = useAccountDetails();

    return (
        <div className=" w-[400px] flex flex-col justify-center gap-5">
            <SvgText text="What's your name" weight="600" height={16} className="text-[#aaaaaa] mt-[15px]" />
            <div className="flex gap-3">
                <SvgInput
                    placeholder="First Name"
                    value={firstName}
                    onChange={setFirstName}
                    weight="600"
                    height={16}
                    className="flex-1 bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-5"
                />
                <SvgInput
                    placeholder="Last Name"
                    value={lastName}
                    onChange={setLastName}
                    weight="600"
                    height={16}
                    className="flex-1 bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-5"
                />
            </div>
        </div>
    );
}
