"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/features/reviews/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  bookingId,
  professionalId,
}: {
  bookingId: string;
  professionalId: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    const result = await submitReview({ bookingId, professionalId, rating, comment });

    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success("Thanks for your review.");
      setComment("");
    }

    setPending(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => setRating(star)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-5",
                star <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
      </div>

      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="How was the work? (optional)"
        rows={3}
      />

      <Button size="sm" disabled={pending} onClick={handleSubmit}>
        {pending ? "Sending…" : "Submit review"}
      </Button>
    </div>
  );
}
