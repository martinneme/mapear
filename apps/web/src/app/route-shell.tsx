"use client";

import React from "react";
import AppHeader from "./_components/AppHeader";
import Breadcrumbs from "./_components/Breadcrumbs";

export default function RouteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        {children}
      </main>
    </div>
  );
}