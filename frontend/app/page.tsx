"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookCreationForm from "@/components/BookCreationForm";
import WritingDashboard from "@/components/WritingDashboard";
import LandingHero from "@/components/LandingHero";

type AppView = "landing" | "create" | "dashboard";

interface BookSession {
  sessionId: string;
  title: string;
  genre: string;
}

export default function HomePage() {
  const [view, setView] = useState<AppView>("landing");
  const [session, setSession] = useState<BookSession | null>(null);

  function handleSessionCreated(s: BookSession) {
    setSession(s);
    setView("dashboard");
  }

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <LandingHero onStart={() => setView("create")} />
          </motion.div>
        )}

        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <BookCreationForm
              onBack={() => setView("landing")}
              onSuccess={handleSessionCreated}
            />
          </motion.div>
        )}

        {view === "dashboard" && session && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <WritingDashboard session={session} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
