"use client";
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import { Squircle } from "../../../components/layout/Squircle";
import { useAccountDetails } from "../context";
import { MONTHS_ABBR, MONTHS_FULL, SPRING } from "../constants";
import { daysInMonth, ordinal } from "../helpers";

const getDayCols = (dayCount: number) => {
    const colSizes: number[] = [];
    let remaining = dayCount;
    let currentHeight = 1;

    // Determine how many items go into each column
    while (remaining > 0) {
        const size = Math.min(Math.min(currentHeight, 6), remaining);
        colSizes.push(size);
        remaining -= size;
        currentHeight++;
    }

    const cols: (number | null)[][] = [];
    let currentDay = 1;

    for (const size of colSizes) {
        const col: (number | null)[] = [];
        // Add the real numbers (bottom to top approach = push to top via unshift)
        for (let i = 0; i < size; i++) {
            col.unshift(currentDay);
            currentDay++;
        }
        // Pad with nulls at the top so the maximum height of the flex-col is always 6
        while (col.length < 6) {
            col.unshift(null);
        }
        cols.push(col);
    }
    return cols;
};

export default function BirthdayPage() {
    const {
        firstName,
        selDay, setSelDay,
        selMonth, setSelMonth,
        yearPrefix, setYearPrefix,
        yearSuffix, setYearSuffix,
    } = useAccountDetails();

    const suffixLen = 2;
    const year = yearPrefix + yearSuffix;
    const yearNum = parseInt(year) || new Date().getFullYear();

    const birthdayText =
        selDay !== null && yearSuffix.length === suffixLen
            ? `${ordinal(selDay)} ${MONTHS_FULL[selMonth]} ${year}`
            : null;

    const dayCount = daysInMonth(selMonth, yearNum);

    const ageError = (() => {
        if (selDay === null || yearSuffix.length !== suffixLen) return null;
        const birth = new Date(yearNum, selMonth, selDay);
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 13);
        return birth > cutoff ? "You must be at least 13 years old." : null;
    })();

    const handleMonthChange = (m: number) => {
        setSelMonth(m);
        if (selDay !== null && selDay > daysInMonth(m, yearNum)) setSelDay(null);
    };

    return (
        <div className="flex flex-col gap-4">
            <SvgText
                text={`${firstName}, Tell us about your Birthday`}
                weight="600" height={16} className="text-[#aaaaaa] mt-[15px]"
            />

            <div className="flex gap-2 md:gap-3 items-start flex-wrap justify-between w-full">

                {/* Left Col: Day + Year */}
                <div className="flex flex-col gap-3 shrink-0">

                    {/* Day block */}
                    <Squircle borderRadius={24} smoothing={50} className="bg-[#f1f1f1] p-4 flex gap-3 w-fit h-fit">
                        <div className="mt-2 ml-2 absolute "><SvgText text="Day" weight="600" height={16} className="text-[#aaaaaa]" /></div>
                        <div className="flex items-end">
                            {getDayCols(dayCount).map((col, cIdx) => (
                                <div key={cIdx} className="flex flex-col gap-[5px] justify-end">
                                    {col.map((d, i) => {
                                        if (d === null) return <div key={`empty-${cIdx}-${i}`} className="w-[26px] h-[26px] md:w-[30px] md:h-[30px] shrink-0" />;
                                        const selected = selDay === d;
                                        return (
                                            <button
                                                key={d}
                                                onClick={() => setSelDay(d)}
                                                className={`w-[26px] h-[26px] md:w-[30px] md:h-[30px] rounded-full flex items-center justify-center transition-colors shrink-0 ${selected ? "bg-[#0000f4] text-white" : "text-[#1e1e1e] hover:bg-white"
                                                    }`}
                                            >
                                                <SvgText text={d.toString()} weight="600" height={16} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </Squircle>

                    {/* Year Box */}
                    <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] h-[72px] w-full flex items-center px-5 justify-between">
                        <SvgText text="Year" weight="600" height={16} className="text-[#aaaaaa] ml-2" />
                        <div className="flex items-center gap-[20px]">
                            {(["19", "20"] as const).map(p => {
                                const active = yearPrefix === p;
                                const mainText = p;
                                const activeSuffixLen = 2;

                                return (
                                    <div key={p} className="flex items-center">
                                        <button
                                            onClick={() => {
                                                setYearPrefix(p);
                                                setYearSuffix("");
                                                setTimeout(() => document.getElementById("year-suffix-input")?.focus(), 10);
                                            }}
                                            className={`cursor-pointer transition-all flex items-center pt-0.5 gap-[2px] ${active ? "text-[#1e1e1e]" : "text-[#aaaaaa] hover:text-[#1e1e1e]"
                                                }`}
                                        >
                                            <SvgText text={mainText} weight="600" height={active ? 24 : 16} maxWidth={120} />
                                            {!active && <SvgText text={"_".repeat(activeSuffixLen)} weight="600" height={16} className="ml-[1px]" />}
                                        </button>

                                        {active && (
                                            <div className="flex items-center text-[#0000f4] pt-0.5 ml-[2px]">
                                                <div style={{ width: activeSuffixLen * 18 + 4, marginLeft: 2 }}>
                                                    <SvgInput
                                                        id="year-suffix-input"
                                                        value={yearSuffix}
                                                        onChange={val => setYearSuffix(val.replace(/\D/g, "").slice(0, activeSuffixLen))}
                                                        placeholder={"_".repeat(activeSuffixLen)}
                                                        weight="600"
                                                        height={24}
                                                        className="text-[#0000f4] w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Squircle>
                </div>

                {/* Right Col: Months */}
                <div className="flex gap-2">
                    <div className="flex flex-col gap-2">
                        {MONTHS_ABBR.slice(0, 6).map((m, i) => {
                            const active = selMonth === i;
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleMonthChange(i)}
                                    className={`w-[42px] h-[42px] md:w-[46px] md:h-[46px] rounded-full flex items-center justify-center transition-colors shrink-0 ${active ? "bg-[#0000f4] text-white" : "bg-[#f1f1f1] text-[#1e1e1e] hover:bg-[#e1e1e1]"
                                        }`}
                                >
                                    <SvgText text={m} weight="600" height={14} />
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-col gap-2">
                        {MONTHS_ABBR.slice(6, 12).map((m, i) => {
                            const actualIndex = i + 6;
                            const active = selMonth === actualIndex;
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleMonthChange(actualIndex)}
                                    className={`w-[42px] h-[42px] md:w-[46px] md:h-[46px] rounded-full flex items-center justify-center transition-colors shrink-0 ${active ? "bg-[#0000f4] text-white" : "bg-[#f1f1f1] text-[#1e1e1e] hover:bg-[#e1e1e1]"
                                        }`}
                                >
                                    <SvgText text={m} weight="600" height={14} />
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>

            {ageError && (
                <SvgText text={ageError} weight="600" height={14} className="text-[#ff0000]" />
            )}
        </div>
    );
}
