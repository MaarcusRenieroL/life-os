import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

import { playCue, setSoundEnabled, soundEnabled } from './sound';

/** Turns the little sound cues on or off. Off until you ask for them. */
export function SoundToggle() {
  const [on, setOn] = useState(soundEnabled);
  return (
    <button
      type="button"
      aria-label={on ? 'Turn sound effects off' : 'Turn sound effects on'}
      title={on ? 'Sound on' : 'Sound off'}
      className="grid size-8 place-items-center text-muted-foreground transition-colors hover:text-primary"
      onClick={() => {
        const next = !on;
        setSoundEnabled(next);
        setOn(next);
        if (next) playCue('clear');
      }}
    >
      {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
