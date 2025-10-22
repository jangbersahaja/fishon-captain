import { Cog, Megaphone, Receipt, UserRoundCheck } from "lucide-react";
import { Feature } from "./ListYourBusinessUI";

export default function ValuePropsSection() {
  return (
    <section className="bg-[#ec2227]">
      <div className="mx-auto w-full max-w-7xl px-4 py-15 sm:px-6 lg:px-8 ">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
          What you get
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            Icon={UserRoundCheck}
            title="Malaysia‑first audience"
            desc="Reach anglers browsing by state, lake/river and near‑shore/offshore."
          />
          <Feature
            Icon={Megaphone}
            title="Marketing push"
            desc="Destination guides & seasonal promos to get discovered."
          />
          <Feature
            Icon={Receipt}
            title="Simple pricing"
            desc="Free to list; pick a commission tier that fits your needs."
          />
          <Feature
            Icon={Cog}
            title="Lead‑ready tools"
            desc="WhatsApp/phone/email leads + calendar tools (coming soon)."
          />
        </div>
      </div>
    </section>
  );
}
