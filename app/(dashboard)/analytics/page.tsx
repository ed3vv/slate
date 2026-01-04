"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks";
import { useFocusSessions } from "@/lib/useFocusSessions";
import { AnalyticsView } from "@/components/ui/analytics-view"
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PartyManagement } from "@/components/ui/party-management";

export default function AnalyticsSection() {
    const { user, loading: authLoading } = useAuth(true);
    const { sessions, deleteSession, refresh } = useFocusSessions(!authLoading && !!user, user?.id);
    const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Refresh sessions when the page becomes visible or when a session is added
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && user?.id) {
                refresh();
            }
        };

        const handleSessionAdded = () => {
            if (user?.id) {
                refresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focusSessionAdded', handleSessionAdded);

        // Also refresh on mount
        if (user?.id) {
            refresh();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focusSessionAdded', handleSessionAdded);
        };
    }, [user?.id, refresh]);

    const handleDeleteRequest = (sessionTimestamp: number) => {
        setSessionToDelete(sessionTimestamp);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (sessionToDelete !== null) {
            deleteSession(sessionToDelete);
        }
        setShowDeleteConfirm(false);
        setSessionToDelete(null);
    };

    return (
        <>
            <div className="space-y-6">
                <PartyManagement />
                <AnalyticsView
                    focusSessions={sessions}
                    onDeleteSession={handleDeleteRequest}
                />
            </div>
            <ConfirmDialog
                show={showDeleteConfirm}
                title="Delete Session?"
                message="Are you sure you want to delete this focus session? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setSessionToDelete(null);
                }}
            />
        </>
    )
}