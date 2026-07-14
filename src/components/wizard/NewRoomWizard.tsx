import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore, type WizardStep } from '../../store/useUiStore';
import { confirmDialog } from '../../store/useDialogStore';
import { cancelNewRoomWizard, finishNewRoomWizard } from '../../lib/nav';
import { PlanEditor } from '../plan/PlanEditor';
import { Icon } from '../ui/Icon';

/**
 * The guided "New room" wizard: clear, ordered steps for building a room from
 * scratch — name it, draw its walls, then add doors and windows — before dropping
 * the user into the 3D view to furnish it. Each step shows only the controls that
 * matter to it, and you can move back and forth freely; the room is provisional
 * until the last step, so cancelling leaves nothing behind.
 *
 * The two floor-plan steps reuse the real {@link PlanEditor} (driven by its
 * `wizardStep` prop) rather than a bespoke canvas, so drawing behaves exactly as
 * it does when editing an existing plan.
 */

const STEPS: { id: WizardStep; label: string; title: string }[] = [
  { id: 'name', label: 'Name', title: 'Name your room' },
  { id: 'walls', label: 'Walls', title: 'Draw the walls' },
  { id: 'openings', label: 'Doors & windows', title: 'Add doors & windows' },
];

export function NewRoomWizard() {
  const step = useUiStore((s) => s.wizardStep) ?? 'name';
  const setWizardStep = useUiStore((s) => s.setWizardStep);
  const hasExterior = useDesignStore((s) => s.design.walls.some((w) => w.kind === 'exterior'));

  const index = STEPS.findIndex((s) => s.id === step);
  const isLast = index === STEPS.length - 1;

  // The name is only ever blank if the user clears the pre-filled default; restore
  // it before leaving the naming step so a room is never nameless.
  const ensureName = () => {
    const { design, renameRoom } = useDesignStore.getState();
    if (!design.name.trim()) renameRoom(design.id, '');
  };

  const goToStep = (target: WizardStep) => {
    if (step === 'name') ensureName();
    setWizardStep(target);
  };

  const back = () => {
    if (index === 0) {
      void cancel();
      return;
    }
    goToStep(STEPS[index - 1].id);
  };

  const next = () => {
    if (step === 'name') ensureName();
    if (isLast) {
      finishNewRoomWizard();
      return;
    }
    setWizardStep(STEPS[index + 1].id);
  };

  const cancel = async () => {
    // Guard against losing real work: once an outline exists, confirm before
    // throwing the room away.
    if (hasExterior) {
      const ok = await confirmDialog({
        title: 'Discard this room?',
        message: 'You haven’t finished setting up this room. Leaving now discards it.',
        confirmLabel: 'Discard',
        danger: true,
      });
      if (!ok) return;
    }
    cancelNewRoomWizard();
  };

  const nextDisabled = step === 'walls' && !hasExterior;

  return (
    <div className="wizard">
      <header className="wizard-head">
        <ol className="wizard-steps">
          {STEPS.map((s, i) => {
            const state = i === index ? 'is-active' : i < index ? 'is-done' : 'is-upcoming';
            return (
              <li key={s.id} className={`wizard-step ${state}`}>
                <button
                  type="button"
                  className="wizard-step-btn"
                  // Only completed (earlier) steps are reachable by tapping the
                  // stepper; move forward with Next so required steps aren't skipped.
                  disabled={i >= index}
                  onClick={() => goToStep(s.id)}
                >
                  <span className="wizard-step-num" aria-hidden="true">
                    {i < index ? <Icon name="check" /> : i + 1}
                  </span>
                  <span className="wizard-step-label">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="btn-icon wizard-close"
          aria-label="Cancel and return to your rooms"
          title="Cancel"
          onClick={() => void cancel()}
        >
          <Icon name="x" />
        </button>
      </header>

      <div className="wizard-body">
        {step === 'name' ? (
          <NameStep onEnter={next} />
        ) : (
          <PlanEditor wizardStep={step === 'openings' ? 'openings' : 'walls'} />
        )}
      </div>

      <footer className="wizard-foot">
        <button type="button" className="btn" onClick={back}>
          <Icon name="chevron-left" /> {index === 0 ? 'Cancel' : 'Back'}
        </button>
        <span className="wizard-foot-title">{STEPS[index].title}</span>
        {nextDisabled ? (
          <span className="btn-tooltip-wrap" title="Draw the room’s outline first">
            <button type="button" className="btn btn-accent" disabled>
              Next <Icon name="chevron-right" />
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-accent" onClick={next}>
            {isLast ? (
              <>
                <Icon name="check" /> Create room
              </>
            ) : (
              <>
                Next <Icon name="chevron-right" />
              </>
            )}
          </button>
        )}
      </footer>
    </div>
  );
}

/** Step 1: name the room. Pre-filled with a default, so the user can just continue. */
function NameStep({ onEnter }: { onEnter: () => void }) {
  const name = useDesignStore((s) => s.design.name);
  const setName = useDesignStore((s) => s.setName);

  return (
    <div className="wizard-name">
      <div className="wizard-name-card">
        <span className="wizard-name-thumb" aria-hidden="true">
          <Icon name="pencil" />
        </span>
        <h2>Name your room</h2>
        <p className="hint">
          We’ve filled in a name so you can just continue — change it now or rename it later,
          it’s up to you.
        </p>
        <label className="field">
          <span className="field-label">Room name</span>
          <span className="field-input">
            <input
              type="text"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onEnter();
                }
              }}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
