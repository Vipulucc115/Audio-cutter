'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import WaveSurfer from 'wavesurfer.js';
import { Box, Button, Slider } from '@mantine/core';
import { audioFileAtom, endTimeAtom, startTimeAtom } from '@/context/atoms';

const WaveformPlayer = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const audioFile = useRecoilValue(audioFileAtom);
  const startTime = useRecoilValue(startTimeAtom);
  const endTime = useRecoilValue(endTimeAtom);
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize Wavesurfer
  useEffect(() => {
    if (waveformRef.current && !waveSurfer) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#A0A0A0',
        progressColor: '#4A90E2',
        cursorColor: '#fff',
        barWidth: 3,
        height: 128,
        backend: 'WebAudio',
      });
      setWaveSurfer(ws);
    }
  }, [waveformRef, waveSurfer, startTime, endTime, audioFile]);

  // Load the audio file into WaveSurfer
  useEffect(() => {
    if (waveSurfer && audioFile) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(audioFile);
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          waveSurfer.loadBlob(new Blob([event.target.result]));
        }
      };
    }
  }, [waveSurfer, audioFile, startTime, endTime]);

  // Adjust playback to start and end times
  useEffect(() => {
    if (waveSurfer && startTime && endTime) {
      waveSurfer.on('ready', () => {
        waveSurfer.setPlaybackRate(1);
        waveSurfer.setTime(startTime); // Start playback at start time
      });

      waveSurfer.on('audioprocess', () => {
        const currentTime = waveSurfer.getCurrentTime();
        setCurrentTime(currentTime);

        if (currentTime >= endTime) {
          waveSurfer.pause();
          setIsPlaying(false);
        }
      });
    }

    return () => {
      waveSurfer?.destroy(); // Clean up when component unmounts
    };
  }, [waveSurfer, audioFile, startTime, endTime]);

  // // Make the waveform responsive
  // useEffect(() => {
  //   const handleResize = () => {
  //     if (waveSurfer && waveformRef.current) {
  //       waveSurfer.drawBuffer; // Redraw the waveform on resize
  //     }
  //   };

  //   window.addEventListener('resize', handleResize);

  //   return () => {
  //     window.removeEventListener('resize', handleResize);
  //   };
  // }, [waveSurfer]);

  const handlePlayPause = () => {
    if (waveSurfer) {
      if (isPlaying) {
        waveSurfer.pause();
      } else {
        waveSurfer.play();
        waveSurfer.setTime(startTime); // Seek to start time manually
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (value: number) => {
    if (waveSurfer) {
      waveSurfer.setTime(value); // Seek to new time
      setCurrentTime(value); // Update current time
    }
  };

  return (
    <Box
      style={{
        textAlign: 'center',
        marginTop: '20px',
        width: '80vw',
        zIndex: '99',
        marginLeft: '23%',
      }}
    >
      <div ref={waveformRef} style={{ width: '100%', maxWidth: '1200px', marginBottom: '10px' }} />

      <Button onClick={handlePlayPause} style={{ backgroundColor: '#7C3AED', color: '#fff' }}>
        {isPlaying ? 'Pause' : 'Play'}
      </Button>

      {/* Slider for seeking */}
      <Slider
        min={startTime}
        max={endTime}
        value={currentTime}
        onChange={handleSliderChange}
        step={0.01}
        styles={{ track: { backgroundColor: '#4A90E2' }, thumb: { backgroundColor: '#fff' } }}
        style={{ marginTop: '20px' }}
      />
    </Box>
  );
};

export default WaveformPlayer;
