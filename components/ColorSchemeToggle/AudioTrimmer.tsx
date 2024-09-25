'use client';

import React, { useState } from 'react';
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
import WaveformPlayer from './WaveformPlayer';

export default function BasicAudioCutterUI() {
  const [showTrimmer, setShowTrimmer] = useState(false); // State to toggle visibility of Audio Trimmer
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  // Function to handle file upload
  const handleFileUpload = async (file: File) => {
    setAudioFile(file);
    const arrayBuffer = await file.arrayBuffer();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
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
          <Button variant="subtle" color="gray" fullWidth>
            Remover
          </Button>
          <Button variant="subtle" color="gray" fullWidth>
            Splitter
          </Button>
          <Button variant="subtle" color="gray" fullWidth>
            Pitcher
          </Button>
          <Button variant="subtle" color="gray" fullWidth>
            Key BPM Finder
          </Button>
          <Button variant="filled" color="violet" fullWidth onClick={() => setShowTrimmer(true)}>
            Cutter
          </Button>
          <Button variant="subtle" color="gray" fullWidth>
            Joiner
          </Button>
          <Button variant="subtle" color="gray" fullWidth>
            Recorder
          </Button>
          <Button variant="subtle" color="gray" fullWidth>
            Support
          </Button>
        </div>
        <Button variant="subtle" color="gray" fullWidth>
          🇬🇧
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

            {/* Show waveform after file is uploaded */}
            {audioFile && (
              <WaveformPlayer audioFile={audioFile} startTime={startTime} endTime={endTime} />
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
                    width: '100%',
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
                      onChange={(value) => setStartTime((value as number) || 0)}
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
                      onChange={(value) => setEndTime((value as number) || audioBuffer.duration)}
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
