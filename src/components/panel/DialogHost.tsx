import { useEffect, useRef, useState } from 'react';
import { useDialogStore } from '../../store/useDialogStore';
import { Icon } from '../ui/Icon';

/**
 * Renders the app's confirm/prompt dialogs (see useDialogStore) using the shared
 * `.modal` styling, so they match the furniture dialog and every other pop-up.
 * Only one dialog is ever active at a time.
 */
export function DialogHost() {
  const active = useDialogStore((s) => s.active);
  const submit = useDialogStore((s) => s.submit);
  const cancel = useDialogStore((s) => s.cancel);

  // Local text for the prompt field; reset whenever a new prompt opens.
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active?.kind === 'prompt') {
      setText(active.initial);
      // Focus and select the text on open, like a native prompt.
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [active]);

  // Esc cancels, Enter confirms — mirroring native dialog behaviour.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter' && active.kind === 'confirm') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, cancel, submit]);

  if (!active) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={cancel}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label={active.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{active.title}</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={cancel}>
            <Icon name="x" />
          </button>
        </div>

        {active.kind === 'confirm' ? (
          <div className="modal-body">
            <p className="modal-message">{active.message}</p>
          </div>
        ) : (
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
          >
            <label className="field">
              <span className="field-label">{active.label}</span>
              <span className="field-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </span>
            </label>
          </form>
        )}

        <div className="modal-foot">
          <button type="button" className="btn" onClick={cancel}>
            {active.cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${active.kind === 'confirm' && active.danger ? 'btn-danger' : 'btn-accent'}`}
            onClick={() => (active.kind === 'confirm' ? submit() : submit(text))}
          >
            {active.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
