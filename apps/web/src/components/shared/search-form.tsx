import { Search, X } from "lucide-react";
import Link from "next/link";

import { Input } from "@/components/ui/input";

interface SearchFormProps {
  action: string;
  placeholder?: string;
  defaultValue?: string;
  label?: string;
  className?: string;
}

/**
 * Server-rendered search field. Submitting reloads the list with `?search=`,
 * matching the filters the list services already understand.
 */
export function SearchForm({
  action,
  placeholder = "Search…",
  defaultValue,
  label = "Search",
  className,
}: SearchFormProps) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={className ?? "relative w-full sm:max-w-sm"}
    >
      <label htmlFor={`search-${action}`} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={`search-${action}`}
        name="search"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="bg-card pl-9 pr-9"
      />
      {defaultValue ? (
        <Link
          href={action}
          className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Clear search"
        >
          <X className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </form>
  );
}
