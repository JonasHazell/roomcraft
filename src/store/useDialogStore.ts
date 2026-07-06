import { create } from 'zustand';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  danger?: boolean;
}

interface PromptOptions {
  title?: string;
  /** Label shown above the text field. */
  label?: string;
  initial?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export type ActiveDialog =
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      danger: boolean;
      resolve: (ok: boolean) => void;
    }
  | {
      kind: 'prompt';
      title: string;
      label: string;
      initial: string;
      confirmLabel: string;
      cancelLabel: string;
      resolve: (value: string | null) => void;
    };

interface DialogState {
  active: ActiveDialog | null;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
  /** Confirm/submit the active dialog. `value` is the prompt's text. */
  submit: (value?: string) => void;
  /** Dismiss the active dialog (Cancel, Esc, backdrop). */
  cancel: () => void;
}

/**
 * In-app replacement for window.confirm / window.prompt so every confirmation
 * and rename looks like the rest of the app (see DialogHost). Both methods
 * return a promise that resolves when the user answers.
 */
export const useDialogStore = create<DialogState>()((set, get) => ({
  active: null,

  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        active: {
          kind: 'confirm',
          title: opts.title ?? 'Confirm',
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'OK',
          cancelLabel: opts.cancelLabel ?? 'Cancel',
          danger: opts.danger ?? false,
          resolve,
        },
      });
    }),

  prompt: (opts) =>
    new Promise<string | null>((resolve) => {
      set({
        active: {
          kind: 'prompt',
          title: opts.title ?? 'Rename',
          label: opts.label ?? 'Name',
          initial: opts.initial ?? '',
          confirmLabel: opts.confirmLabel ?? 'Save',
          cancelLabel: opts.cancelLabel ?? 'Cancel',
          resolve,
        },
      });
    }),

  submit: (value) => {
    const active = get().active;
    if (!active) return;
    if (active.kind === 'confirm') active.resolve(true);
    else active.resolve(value ?? '');
    set({ active: null });
  },

  cancel: () => {
    const active = get().active;
    if (!active) return;
    if (active.kind === 'confirm') active.resolve(false);
    else active.resolve(null);
    set({ active: null });
  },
}));

/** Show a styled confirmation dialog. Resolves true if the user confirms. */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return useDialogStore.getState().confirm(opts);
}

/** Show a styled prompt dialog. Resolves the entered text, or null if cancelled. */
export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return useDialogStore.getState().prompt(opts);
}
