import { FilePenLine, MessageCircle } from "lucide-react";
import Link from "next/link";

const WHATSAPP_NUMBER = "60165304304"; // TODO: replace with production number

export default function FinalCTASection() {
  return (
    <section className="bg-[#EC2227]">
      <div className="w-full px-4 pb-64 mx-auto text-white max-w-7xl pt-25 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold md:text-3xl">
              Ready to reach more anglers?
            </h3>
            <p className="mt-1 text-base text-white/90 md:text-lg">
              Create your listing in minutes. It’s free to start.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth?next=/captain/form"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#EC2227] shadow hover:bg-white/90 text-base"
            >
              <FilePenLine className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              Register your charter
            </Link>
            <Link
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Nak%20Fishon`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 text-base font-semibold text-white border rounded-xl border-white/40 hover:bg-white/10"
            >
              <MessageCircle className="w-5 h-5 md:h-6 md:w-6" aria-hidden />
              Talk to us on WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
