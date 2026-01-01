"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';


export default function SettingsPage() {
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
                asChild
                onClick={() => auth && signOut(auth)}
                variant = "outline"
                className="h-9 bg-card hover:bg-secondary text-foreground"
            >
                <Link href='/'>
                    Sign Out
                </Link>
            </Button>
        </div>
        </main>
        
    </>
    
  );
}