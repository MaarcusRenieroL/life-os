import { api, unwrap } from '@/lib/api-client';

import type { NoteGraph } from './types';

export const graphApi = {
  get(): Promise<NoteGraph> {
    return unwrap(api.get('/v1/notes/graph'));
  },
};
