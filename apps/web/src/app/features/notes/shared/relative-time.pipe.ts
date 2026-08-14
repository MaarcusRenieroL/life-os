import { Pipe, PipeTransform } from '@angular/core';

import { relativeTime } from './relative-time.util';

@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    return iso ? relativeTime(iso) : '';
  }
}
