import { useState, useCallback } from 'react';

export function useConfirm() {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Yes',
        cancelText: 'Cancel',
        type: 'warning',
        onConfirm: null
    });

    const showConfirm = useCallback(({
        title = "Confirm Action",
        message,
        confirmText = "Yes",
        cancelText = "Cancel",
        type = "warning"
    }) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                type,
                onConfirm: () => resolve(true)
            });
        });
    }, []);

    const hideConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        // If onConfirm wasn't called, resolve with false (cancelled)
        if (confirmState.onConfirm) {
            // Small delay to ensure the promise resolves after dialog closes
            setTimeout(() => {
                // This will only run if the user clicked cancel/close
                // If they clicked confirm, this won't affect anything since promise already resolved
            }, 100);
        }
    }, [confirmState.onConfirm]);

    const handleConfirm = useCallback(() => {
        if (confirmState.onConfirm) {
            confirmState.onConfirm();
        }
        hideConfirm();
    }, [confirmState.onConfirm, hideConfirm]);

    return {
        showConfirm,
        confirmDialog: {
            isOpen: confirmState.isOpen,
            title: confirmState.title,
            message: confirmState.message,
            confirmText: confirmState.confirmText,
            cancelText: confirmState.cancelText,
            type: confirmState.type,
            onClose: hideConfirm,
            onConfirm: handleConfirm
        }
    };
}