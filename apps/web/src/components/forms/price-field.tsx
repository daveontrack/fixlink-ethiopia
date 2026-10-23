"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface PriceFieldProps {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * Numeric input for money amounts (ETB).
 */
export function PriceField({
  name,
  label,
  description,
  placeholder = "0",
  required,
  className,
}: PriceFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </FormLabel>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ETB</span>
            <FormControl>
              <Input
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                placeholder={placeholder}
                required={required}
                {...field}
                value={field.value ?? ""}
                onChange={(event) =>
                  field.onChange(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
              />
            </FormControl>
          </div>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
