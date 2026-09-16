import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { generatePassword, type PasswordGeneratorOptions } from './utils/password-generator';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (password: string) => void;
}

export function PasswordGeneratorDialog({ open, onOpenChange, onUse }: Props) {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
  });
  const [password, setPassword] = useState(() => generatePassword(options));

  function regenerate(next: PasswordGeneratorOptions) {
    setOptions(next);
    try {
      setPassword(generatePassword(next));
    } catch {
      // all charsets disabled - keep the previous password shown
    }
  }

  const activeCount = [
    options.includeUppercase,
    options.includeLowercase,
    options.includeNumbers,
    options.includeSymbols,
  ].filter(Boolean).length;

  function toggleOption(key: keyof PasswordGeneratorOptions) {
    const isActive = options[key] as boolean;
    // Never let the user disable the last remaining active charset.
    if (isActive && activeCount === 1) return;
    regenerate({ ...options, [key]: !isActive });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate password</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input readOnly value={password} className="font-mono" />
            <Button variant="outline" onClick={() => regenerate(options)}>
              ↻
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Length</span>
              <span>{options.length}</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={options.length}
              onChange={(e) => regenerate({ ...options, length: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={options.includeUppercase} onCheckedChange={() => toggleOption('includeUppercase')} />
              Uppercase (A-Z)
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={options.includeLowercase} onCheckedChange={() => toggleOption('includeLowercase')} />
              Lowercase (a-z)
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={options.includeNumbers} onCheckedChange={() => toggleOption('includeNumbers')} />
              Numbers (0-9)
            </Label>
            <Label className="flex items-center gap-2 text-sm">
              <Checkbox checked={options.includeSymbols} onCheckedChange={() => toggleOption('includeSymbols')} />
              Symbols (!@#…)
            </Label>
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={options.excludeAmbiguous}
              onCheckedChange={(checked) => regenerate({ ...options, excludeAmbiguous: checked === true })}
            />
            Exclude ambiguous characters (O0lI1)
          </Label>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onUse(password);
              onOpenChange(false);
            }}
          >
            Use this password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
