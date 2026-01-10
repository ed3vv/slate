"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClockRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/subjects?clock=1");
  }, [router]);

  return null;
}
