"use client";

import { SignIn } from "@clerk/nextjs";

import { POST_AUTH_REDIRECT } from "@/lib/auth/redirects";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <SignIn
          routing="hash"
          fallbackRedirectUrl={POST_AUTH_REDIRECT}
          forceRedirectUrl={POST_AUTH_REDIRECT}
        />
      </div>
    </div>
  );
}