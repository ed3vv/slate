"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";


export default function SettingsPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
        <main className="p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-2 mb-2">Coming soon.</p>
        <div
            className="flex items-center gap-2"
        >
            <Button
                asChild   
            >
                <Link href="/login">
                    <Home className="h-5 w-5" aria-hidden="true" />
                </Link>
            </Button>
            <Button
                onClick={handleSignOut}
                variant = "outline"
                className="h-9 bg-card hover:bg-secondary text-foreground"
            >
                Sign Out
            </Button>
        </div>
        </main>
        
    </>
    
  );
}
