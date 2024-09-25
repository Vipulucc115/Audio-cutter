'use client';

import { atom } from 'recoil';

// const [audioFile, setAudioFile] = useState<File | null>(null);

export const audioFileAtom = atom<File | null>({
  key: 'audioFile',
  default: null,
});

export const startTimeAtom = atom<number>({
  key: 'startTime',
  default: 0,
});

export const endTimeAtom = atom<number>({
  key: 'endTime',
  default: 0,
});
