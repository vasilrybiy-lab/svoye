"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { campaignCodeFromSiteUrl, type SourceContext } from "@/lib/marketing-source-context.mjs";
const WebsiteSource = createContext<SourceContext | null>(null);
export const useWebsiteSourceContext = () => useContext(WebsiteSource);
export default function WebsiteSourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<SourceContext | null>(null);
  useEffect(() => {
    const publicCode = campaignCodeFromSiteUrl(window.location.href);
    if (publicCode) setSource({ version: 1, publicCode });
  }, []);
  return <WebsiteSource.Provider value={source}>{children}</WebsiteSource.Provider>;
}
