"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestAuth() {
  const [authState, setAuthState] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Get session
      const { data: sessionData } = await supabase.auth.getSession();

      // Get user
      const { data: userData } = await supabase.auth.getUser();

      // Try to insert into test table
      let insertResult = null;
      if (userData.user) {
        const { data, error } = await supabase
          .from("auth_test")
          .insert({ user_id: userData.user.id })
          .select();

        insertResult = { data, error: error?.message };
      }

      setAuthState({
        session: sessionData.session ? {
          user_id: sessionData.session.user.id,
          access_token_present: !!sessionData.session.access_token,
        } : null,
        user: userData.user ? {
          id: userData.user.id,
          email: userData.user.email,
        } : null,
        insertTest: insertResult,
      });
    };

    checkAuth();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(authState, null, 2)}
      </pre>
    </div>
  );
}
