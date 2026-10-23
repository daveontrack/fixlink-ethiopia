"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateProfessionalLanguageAction } from "@/features/professional/actions";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ (Amharic)" },
  { value: "om", label: "Afaan Oromoo" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["value"];

export function LanguagePreferenceForm({
  initialLanguage,
}: {
  initialLanguage: LanguageCode;
}) {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageCode>(initialLanguage);
  const [pending, setPending] = useState(false);

  async function savePreference() {
    setPending(true);
    try {
      const result = await updateProfessionalLanguageAction(language);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Language preference saved.");
      router.refresh();
    } catch {
      toast.error("We could not save your language preference. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="professional-language" className="text-sm font-medium">
          Display language
        </label>
        <select
          id="professional-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as LanguageCode)}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-[var(--role-accent)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={savePreference} disabled={pending}>
        {pending ? "Saving…" : "Save language"}
      </Button>
    </div>
  );
}
