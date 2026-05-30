import { SvgText } from "../../../components/text/SvgText";

export function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return (
        <SvgText
            text={msg}
            weight="500"
            height={12}
            className="text-[#ff0000] self-center mt-1"
        />
    );
}
