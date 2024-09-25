'use client';

import React, { useState } from 'react';
import { useRecoilState } from 'recoil';
import {
  Box,
  Button,
  Container,
  FileInput,
  NumberInput,
  RangeSlider,
  Text,
  Title,
} from '@mantine/core';
import { audioFileAtom, endTimeAtom, startTimeAtom } from '@/context/atoms';
import WaveformPlayer from './WaveformPlayer';

export default function BasicAudioCutterUI() {
  const [showTrimmer, setShowTrimmer] = useState(false); // State to toggle visibility of Audio Trimmer
  const [audioFile, setAudioFile] = useRecoilState(audioFileAtom);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useRecoilState(startTimeAtom);
  const [endTime, setEndTime] = useRecoilState(endTimeAtom);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  // Function to handle file upload
  const handleFileUpload = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    setAudioFile(file);
    setAudioBuffer(buffer);
    setEndTime(buffer.duration); // Set end time to audio duration
  };

  // Function to trim the audio buffer
  const trimAudioBuffer = (buffer: AudioBuffer, start: number, end: number): AudioBuffer => {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    const frameCount = endSample - startSample;

    const trimmedBuffer = new AudioBuffer({
      length: frameCount,
      numberOfChannels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    });

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const trimmedData = channelData.slice(startSample, endSample);
      trimmedBuffer.copyToChannel(trimmedData, channel, 0);
    }

    return trimmedBuffer;
  };

  // Convert trimmed audio buffer to WAV format
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numOfChannels * 2 + 44;
    const result = new DataView(new ArrayBuffer(length));
    const channels = [];
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      result.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      result.setUint32(pos, data, true);
      pos += 4;
    }

    // Write WAV headers
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChannels); // avg. bytes/sec
    setUint16(numOfChannels * 2); // block-align
    setUint16(16); // 16-bit (hardcoded)

    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        result.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([result], { type: 'audio/wav' });
  };

  // Handle downloading of the trimmed audio file
  const handleDownload = () => {
    if (!audioBuffer || startTime >= endTime) return;

    const trimmedBuffer = trimAudioBuffer(audioBuffer, startTime, endTime);
    const audioBlob = bufferToWav(trimmedBuffer);
    const url = URL.createObjectURL(audioBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'trimmed-audio.wav';
    link.click();

    URL.revokeObjectURL(url); // Clean up
  };

  return (
    <Box style={{ display: 'flex', height: '100vh', backgroundColor: '#16161A' }}>
      {/* Sidebar */}
      <Box
        style={{
          width: 170,
          backgroundColor: '#1a1a1d',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px',
          height: '100%',
          position: 'absolute', // Make sidebar absolute
          top: 0, // Align it to the top
          left: 0, // Align it to the left
          zIndex: 1, // Ensure it overlays the footer
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '47px', flex: '1' }}>
          <Button variant="subtle" color="white" fullWidth onClick={() => setShowTrimmer(false)}>
            HOME {/* Button to go back to Browse Files */}
          </Button>
          <Button
            variant="subtle"
            color="gray"
            fullWidth
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} // Flexbox for vertical alignment
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-eraser"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" />
              <path d="M18 13.3l-6.3 -6.3" />
            </svg>

            {/* Text placed below the SVG */}
            <span style={{ marginLeft: '8px' }}>Remover</span>
          </Button>

          <Button variant="subtle" color="gray" fullWidth>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-triangle"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
            </svg>
            {/* Text outside the SVG */}
            <span style={{ marginLeft: '8px' }}>Splitter</span>
          </Button>

          <Button variant="subtle" color="gray" fullWidth>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-letter-y-small"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10 8l2 5l2 -5" />
              <path d="M12 16v-3" />
            </svg>
            <span style={{ marginLeft: '8px', fontSize: '18px' }}>Pitcher</span>{' '}
            {/* Spacing between the icon and the text */}
          </Button>
          <Button variant="subtle" color="gray" fullWidth display="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-triangle-off"
              style={{ marginRight: '8px' }} // Space between the icon and text
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M7.825 7.83l-5.568 9.295a1.914 1.914 0 0 0 1.636 2.871h16.107m1.998 -1.99a1.913 1.913 0 0 0 -.255 -.88l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0l-1.028 1.718" />
              <path d="M3 3l18 18" />
            </svg>
            <span>Key BPM Finder</span>
          </Button>
          <Button
            variant="filled"
            color="violet"
            fullWidth
            display="flex"
            onClick={() => setShowTrimmer(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-cut"
              style={{ marginRight: '8px' }} // Space between the icon and text
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M7 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              <path d="M9.15 14.85l8.85 -10.85" />
              <path d="M6 4l8.85 10.85" />
            </svg>
            <span>Cutter</span>
          </Button>
          <Button variant="subtle" color="gray" fullWidth display="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-arrows-join-2"
              style={{ marginRight: '8px' }} // Space between the icon and text
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 7h1.948c1.913 0 3.705 .933 4.802 2.5a5.861 5.861 0 0 0 4.802 2.5h6.448" />
              <path d="M3 17h1.95a5.854 5.854 0 0 0 4.798 -2.5a5.854 5.854 0 0 1 4.798 -2.5h5.454" />
              <path d="M18 15l3 -3l-3 -3" />
            </svg>
            <span>Joiner</span>
          </Button>

          <Button variant="subtle" color="gray" fullWidth display="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-microphone"
              style={{ marginRight: '8px' }} // Space between the icon and text
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <path d="M8 21l8 0" />
              <path d="M12 17l0 4" />
            </svg>
            <span>Recorder</span>
          </Button>

          <Button variant="subtle" color="gray" fullWidth display="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="icon icon-tabler icons-tabler-filled icon-tabler-help-octagon"
              style={{ marginRight: '8px' }} // Space between the icon and text
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M14.897 1a4 4 0 0 1 2.664 1.016l.165 .156l4.1 4.1a4 4 0 0 1 1.168 2.605l.006 .227v5.794a4 4 0 0 1 -1.016 2.664l-.156 .165l-4.1 4.1a4 4 0 0 1 -2.603 1.168l-.227 .006h-5.795a3.999 3.999 0 0 1 -2.664 -1.017l-.165 -.156l-4.1 -4.1a4 4 0 0 1 -1.168 -2.604l-.006 -.227v-5.794a4 4 0 0 1 1.016 -2.664l.156 -.165l4.1 -4.1a4 4 0 0 1 2.605 -1.168l.227 -.006h5.793zm-2.897 14a1 1 0 0 0 -.993 .883l-.007 .117l.007 .127a1 1 0 0 0 1.986 0l.007 -.117l-.007 -.127a1 1 0 0 0 -.993 -.883zm1.368 -6.673a2.98 2.98 0 0 0 -3.631 .728a1 1 0 0 0 1.44 1.383l.171 -.18a.98 .98 0 0 1 1.11 -.15a1 1 0 0 1 -.34 1.886l-.232 .012a1 1 0 0 0 .111 1.994a3 3 0 0 0 1.371 -5.673z" />
            </svg>

            <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'gray.500' }}>
              Support
            </span>
          </Button>
        </div>
        <Button variant="subtle" color="gray" fullWidth>
          <span style={{ fontSize: '36px' }}>🇬🇧</span> {/* Adjust fontSize as needed */}
        </Button>
      </Box>

      {/* Main Content */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Content */}
        {showTrimmer ? (
          <Container
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {/* Upload audio file */}
            <FileInput
              placeholder="Browse my files"
              onChange={(file) => file && handleFileUpload(file)}
              accept="audio/*"
              styles={{
                input: {
                  backgroundColor: '#4A4A4A', // Custom background color
                  color: 'white', // Custom text color
                  borderRadius: '30px', // Rounded corners
                  padding: '10px 20px', // Padding
                  border: '2px solid #7C3AED', // Custom border color
                  cursor: 'pointer', // Change cursor to pointer
                  fontSize: '16px',
                  textAlign: 'center',
                },
              }}
            />

            {audioFile && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '80%', // Ensure it takes full width
                  height: 'calc(100vh - 200px)', // Leave space for the header/footer or other elements
                }}
              >
                <WaveformPlayer />
              </div>
            )}

            {/* Show trimming options if audio is loaded */}
            {audioBuffer && (
              <>
                {/* Main Content */}
                <div style={{ marginTop: '20px', flex: 1 }}></div>
                {/* Line above the footer */}
                <Box
                  style={{
                    height: '2px', // Height of the line
                    backgroundColor: 'white', // Color of the line
                    width: '100%', // Full width
                    margin: '20px 0', // Margin for spacing
                  }}
                />

                {/* Footer */}
                <Box
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: 'calc(100% - 10px)',
                    backgroundColor: '#16161A',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {/* Start and End Time Inputs Centered */}
                  <Box style={{ display: 'flex', gap: '20px', justifyContent: 'center', flex: 1 }}>
                    {/* Start time input */}
                    <NumberInput
                      label="Start Time (seconds)"
                      min={0}
                      max={audioBuffer.duration}
                      step={0.01}
                      value={startTime}
                      onChange={(value) => setStartTime(value as number)}
                      style={{ width: '150px' }} // Adjust input width
                      styles={{
                        label: {
                          color: 'white', // Set label color to white
                        },
                      }}
                    />

                    {/* End time input */}
                    <NumberInput
                      label="End Time (seconds)"
                      min={startTime}
                      max={audioBuffer.duration}
                      step={0.01}
                      value={endTime}
                      onChange={(value) => {
                        const val = value as number;
                        if (val > audioBuffer.duration) return setEndTime(audioBuffer.duration);
                        setEndTime(val);
                      }}
                      style={{ width: '150px' }} // Adjust input width
                      styles={{
                        label: {
                          color: 'white', // Set label color to white
                        },
                      }}
                    />
                  </Box>

                  {/* Download button aligned to the right */}
                  <Button
                    onClick={handleDownload}
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: '#D3D3DF',
                      color: '#17171E',
                      borderRadius: '8px',
                      padding: '10px 20px',
                    }}
                  >
                    Save
                  </Button>
                </Box>
              </>
            )}
          </Container>
        ) : (
          <Container
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {/* Keep "HOW IT WORKS" and "JOINER" in the same line with decreased space */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                marginBottom: '50px',
              }}
            >
              <Text style={{ color: 'white', marginRight: '5px' }}>HOW IT WORKS</Text>
              <Text style={{ color: 'white', marginLeft: '5px' }}>JOINER</Text>
            </div>

            <Title order={1} mb="lg" style={{ color: 'white' }}>
              Audio Cutter
            </Title>
            <Text mb="xl" size="lg" style={{ color: 'white', textAlign: 'center' }}>
              Free editor to trim and cut any audio file online
            </Text>
            <Button radius="md" size="lg" color="violet" onClick={() => setShowTrimmer(true)}>
              Start Editing
            </Button>
          </Container>
        )}
      </Box>
    </Box>
  );
}
