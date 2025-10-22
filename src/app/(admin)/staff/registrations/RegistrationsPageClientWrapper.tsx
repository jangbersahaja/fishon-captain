"use client";
import dynamic from "next/dynamic";
import type { RegistrationsClientProps } from "./RegistrationsClient";

const RegistrationsClient = dynamic(
  () => import("./RegistrationsClient").then((m) => m.RegistrationsClient),
  { ssr: false }
);

export default function RegistrationsPageClientWrapper(
  props: RegistrationsClientProps
) {
  return <RegistrationsClient {...props} />;
}
