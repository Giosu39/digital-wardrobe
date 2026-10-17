import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";

function readPref(): ThemePref {
  try {
    return (localStorage.getItem("theme") as ThemePref) || "system";
  } catch {
    return "system";
  }
}

const resolveDark = (pref: ThemePref) =>
  pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref);
  const [isDark, setIsDark] = useState(() => resolveDark(readPref()));

  useEffect(() => {
    const apply = () => {
      const dark = resolveDark(pref);
      document.documentElement.classList.toggle("dark", dark);
      setIsDark(dark);
    };
    apply();
    try {
      localStorage.setItem("theme", pref);
    } catch {
      // ignorato
    }
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  return { pref, setPref, isDark };
}
