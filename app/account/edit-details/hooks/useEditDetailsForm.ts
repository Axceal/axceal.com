"use client";
import { useEffect, useState, useRef } from "react";
import { signOut } from "next-auth/react";
import { ordinal } from "../../details/helpers";
import { apiFetch } from "@/lib/http/client";

const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type AccountOverview = {
    email: string;
    createdAt: string;
    profile: {
        firstName: string | null;
        lastName: string | null;
        birthday: string | null;
        gender: "female" | "male" | "private" | null;
        phoneCountryCode: string | null;
        phone: string | null;
        phoneSign: "+" | "-";
    };
};

export type EditField = "firstName" | "lastName" | "birthday" | "gender" | "phone";

export function useEditDetailsForm() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthday, setBirthday] = useState("");
    const [gender, setGender] = useState("");
    const [phone, setPhone] = useState("");

    const [pillSaving, setPillSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    const [activeEditField, setActiveEditField] = useState<EditField | null>(null);
    const [pillInputValue, setPillInputValue] = useState("");

    const firstNameRef = useRef<HTMLDivElement>(null);
    const lastNameRef = useRef<HTMLDivElement>(null);
    const birthdayRef = useRef<HTMLDivElement>(null);
    const genderRef = useRef<HTMLDivElement>(null);
    const phoneRef = useRef<HTMLDivElement>(null);
    const columnRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    useEffect(() => {
        const ac = new AbortController();
        fetch("/api/account/me", { signal: ac.signal, cache: "no-store" })
            .then(async (r) => (r.ok ? r.json() : null))
            .then((body: { ok?: boolean; data?: AccountOverview } | null) => {
                if (body?.ok && body.data) {
                    const p = body.data.profile;
                    if (p.firstName) setFirstName(p.firstName);
                    if (p.lastName) setLastName(p.lastName);
                    if (p.birthday) {
                        const d = new Date(p.birthday);
                        setBirthday(`${ordinal(d.getDate())} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`);
                    }
                    if (p.phone) setPhone(p.phone);
                    if (p.gender) setGender(p.gender);
                }
            })
            .catch(() => { });
        return () => ac.abort();
    }, []);

    const editRefMap: Record<EditField, React.RefObject<HTMLDivElement | null>> = {
        firstName: firstNameRef,
        lastName: lastNameRef,
        birthday: birthdayRef,
        gender: genderRef,
        phone: phoneRef,
    };

    const editPillPlaceholders: Record<EditField, string> = {
        firstName: "New First Name",
        lastName: "New Last Name",
        birthday: "New Birthday",
        gender: "female / male / private",
        phone: "New Phone Number",
    };

    const activeRef = activeEditField ? editRefMap[activeEditField] : null;
    let pillTop = 0;
    let indicatorTop = 0;
    if (activeRef?.current && columnRef.current) {
        const rowRect = activeRef.current.getBoundingClientRect();
        const colRect = columnRef.current.getBoundingClientRect();
        pillTop = rowRect.top - colRect.top + (rowRect.height / 2) - 28;
    }
    if (activeRef?.current && cardRef.current) {
        const rowRect = activeRef.current.getBoundingClientRect();
        const cardRect = cardRef.current.getBoundingClientRect();
        indicatorTop = rowRect.top - cardRect.top + (rowRect.height / 2) - 15;
    }

    const openEditPill = (field: EditField) => {
        if (activeEditField === field) {
            setActiveEditField(null);
            setPillInputValue("");
        } else {
            setActiveEditField(field);
            setPillInputValue("");
        }
        setSaveMessage(null);
    };

    const savePillField = async () => {
        if (!activeEditField || !pillInputValue.trim() || pillSaving) return;
        const v = pillInputValue.trim();
        const field = activeEditField;

        setPillSaving(true);
        setSaveMessage(null);
        try {
            const res = await apiFetch("/api/account/profile", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ [field]: v }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.ok) {
                setSaveMessage({ kind: "error", text: json?.error?.message ?? "Could not save." });
                return;
            }
            switch (field) {
                case "firstName": setFirstName(v); break;
                case "lastName": setLastName(v); break;
                case "birthday": setBirthday(v); break;
                case "gender": setGender(v); break;
                case "phone": setPhone(v); break;
            }
            setSaveMessage({ kind: "info", text: "Saved." });
            setActiveEditField(null);
            setPillInputValue("");
        } catch {
            setSaveMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setPillSaving(false);
        }
    };

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        await signOut({ callbackUrl: "/auth" });
    };

    return {
        firstName, lastName, birthday, gender, phone,
        pillSaving,
        saveMessage,
        loggingOut,
        activeEditField,
        pillInputValue, setPillInputValue,
        firstNameRef, lastNameRef, birthdayRef, genderRef, phoneRef,
        columnRef, cardRef,
        editPillPlaceholders,
        pillTop, indicatorTop,
        openEditPill,
        savePillField,
        handleLogout,
    };
}
