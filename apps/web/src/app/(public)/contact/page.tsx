import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/features/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the FIXLINK team — support for customers and professionals in Diredawa.",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto space-y-10 px-4 py-12">
      <PageHeader
        title="Contact us"
        description="Questions about a booking, a quotation or verification? Send us a message and we will reply within one working day."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <ContactForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Office</p>
                  <p className="text-muted-foreground">
                    Bole Road, Diredawa, Ethiopia
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">+251 91 000 0000</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">hello@fixlink.et</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Support hours</p>
                  <p className="text-muted-foreground">
                    Monday – Saturday, 8:30 – 18:00 (EAT)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
