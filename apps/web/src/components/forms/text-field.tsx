"use client";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface TextFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  description?: string;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal";
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  className?: string;
}

/**
 * Text input wired to react-hook-form + zod through shadcn's form context.
 */
export function TextField({
  name,
  label,
  placeholder,
  type = "text",
  description,
  inputMode,
  autoComplete,
  min,
  max,
  step,
  required,
  className,
}: TextFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              inputMode={inputMode}
              autoComplete={autoComplete}
              min={min}
              max={max}
              step={step}
              required={required}
              {...field}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
