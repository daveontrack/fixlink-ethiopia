import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              FL
            </span>
            {APP_NAME}
          </Link>
          {children}
        </div>
      </div>
      <div className="hidden bg-primary/5 lg:block">
        <div className="flex h-full flex-col justify-center px-12">
          <h2 className="text-3xl font-semibold tracking-tight">
            One marketplace for every home service in Diredawa
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Post a request, compare quotations from verified professionals and
            book the job in minutes — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
