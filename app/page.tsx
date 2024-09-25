'use client';

import { RecoilRoot } from 'recoil';
import AudioTrimmer from '../components/ColorSchemeToggle/AudioTrimmer';

export default function HomePage() {
  return (
    <>
      <RecoilRoot>
        <AudioTrimmer />
      </RecoilRoot>
    </>
  );
}
