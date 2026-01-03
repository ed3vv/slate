"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks";
import { useFocusSessions } from "@/lib/useFocusSessions";
import { AnalyticsView } from "@/components/ui/analytics-view"
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AnalyticsSection() {
    const { user, loading: authLoading } = useAuth(true);
    const { sessions, deleteSession } = useFocusSessions(!authLoading && !!user, user?.id);
    const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
            <AnalyticsView
                focusSessions={sessions}
                onDeleteSession={handleDeleteRequest}
            />
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