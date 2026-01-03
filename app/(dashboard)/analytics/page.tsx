"use client";

import { useState } from "react";
import { useLocalStorage } from "@/lib/hooks";
import { DateUtils } from "@/lib/dateUtils";
import type { FocusSession } from "@/types";
import { AnalyticsView } from "@/components/ui/analytics-view"
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AnalyticsSection() {

    const [focusSessions, setFocusSessions] = useLocalStorage<FocusSession[]>('focusSessions', []);
    const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const deleteFocusSession = (sessionTimestamp: number) => {
        setSessionToDelete(sessionTimestamp);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        setFocusSessions(focusSessions.filter(s => s.timestamp !== sessionToDelete));
        setShowDeleteConfirm(false);
        setSessionToDelete(null);
    };

    return (
        <>
        <AnalyticsView
            focusSessions={focusSessions}
            onDeleteSession={deleteFocusSession}
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