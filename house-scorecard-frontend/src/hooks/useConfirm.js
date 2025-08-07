import { useState, useCallback, useRef } from 'react';

export function useConfirm() {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Yes',
        cancelText: 'Cancel',
        type: 'warning'
    });

    // Use ref to store the promise resolve function to avoid stale closures
    const resolveRef = useRef(null);

    const showConfirm = useCallback(({
        title = "Confirm Action",
        message,
        confirmText = "Yes",
        cancelText = "Cancel",
        type = "warning"
    }) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setConfirmState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                type
            });
        });
    }, []);

    const hideConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        // Resolve with false (cancelled) if still pending
        if (resolveRef.current) {
            const resolve = resolveRef.current;
            resolveRef.current = null;
            resolve(false);
        }
    }, []);

    const handleConfirm = useCallback(() => {
        // Resolve with true (confirmed)
        if (resolveRef.current) {
            const resolve = resolveRef.current;
            resolveRef.current = null;
            resolve(true);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleCancel = useCallback(() => {
        // Resolve with false (cancelled)
        if (resolveRef.current) {
            const resolve = resolveRef.current;
            resolveRef.current = null;
            resolve(false);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        showConfirm,
        confirmDialog: {
            isOpen: confirmState.isOpen,
            title: confirmState.title,
            message: confirmState.message,
            confirmText: confirmState.confirmText,
            cancelText: confirmState.cancelText,
            type: confirmState.type,
            onClose: handleCancel,
            onConfirm: handleConfirm
        }
    };
}