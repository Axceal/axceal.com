export const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;

export const MONTHS_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const COUNTRIES = [
    { code: "+91", name: "India", digits: 10 },
    { code: "+1",  name: "USA", digits: 10 },
    { code: "+44", name: "UK", digits: 10 },
    { code: "+353", name: "Ireland", digits: 9 },
    { code: "+354", name: "Iceland", digits: 7 },
    { code: "+61", name: "Australia", digits: 9 },
    { code: "+49", name: "Germany", digits: 11 },
    { code: "+33", name: "France", digits: 9 },
];

export const STEP_ROUTES = [
    "/account/details/name",
    "/account/details/birthday",
    "/account/details/gender",
    "/account/details/phone",
] as const;

export const STEP_SEGMENTS = ["name", "birthday", "gender", "phone"] as const;
