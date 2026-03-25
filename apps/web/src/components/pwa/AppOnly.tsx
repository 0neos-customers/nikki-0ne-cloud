"use client";

import { useState, useEffect, type ReactNode } from "react";

/**
 * Only renders children on the app subdomain (app.0neos.com).
 * Returns null on marketing domains (0neos.com, project1.ai, etc.)
 */
export function AppOnly({ children }: { children: ReactNode }) {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    setIsApp(window.location.hostname === 'app.0neos.com' || window.location.hostname === 'localhost');
  }, []);

  if (!isApp) return null;
  return <>{children}</>;
}
