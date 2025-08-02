import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone'; // Import Tone.js

// Main App component
const App = () => {
  // State variables for managing UI and data
  const [activeTab, setActiveTab] = useState('yoga'); // 'yoga', 'meditation-guide', or 'meditation-timer'
  const [yogaGoal, setYogaGoal] = useState('');
  const [meditationGoal, setMeditationGoal] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkInState, setCheckInState] = useState('');
  const [suggestedMeditationType, setSuggestedMeditationType] = useState('');
  const [affirmationGoal, setAffirmationGoal] = useState('');
  const [generatedAffirmations, setGeneratedAffirmations] = useState('');


  // Timer states
  const [duration, setDuration] = useState(10); // Default duration in minutes
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Time in seconds
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null); // Ref for setInterval

  // Tone.js audio players
  const backgroundPlayerRef = useRef(null);
  const bellPlayerRef = useRef(null);
  const bellIntervalRef = useRef(null);

  // State to track if audio assets are loaded
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  // Function to ensure audio context is running
  const ensureAudioContext = async () => {
    if (Tone.context.state !== 'running') {
      try {
        await Tone.start();
        console.log("AudioContext resumed/started successfully.");
        return true;
      } catch (e) {
        console.error("Failed to start/resume AudioContext:", e);
        setError("Audio failed to start. Please interact with the page (e.g., click anywhere) and try again.");
        return false;
      }
    }
    return true;
  };

  // Initialize Tone.js players on component mount
  useEffect(() => {
    const initAudioPlayers = async () => {
      // Initialize background music player (simple ambient drone)
      backgroundPlayerRef.current = new Tone.Player({
        url: "https://cdn.jsdelivr.net/gh/Tonejs/Tone.js/examples/audio/sfx/fire.mp3", // Using a simple sound as a placeholder
        loop: true,
        volume: -15 // Start with a lower volume
      }).toDestination();

      // Initialize Tibetan bell player
      bellPlayerRef.current = new Tone.Player({
        url: "https://cdn.jsdelivr.net/gh/Tonejs/Tone.js/examples/audio/sfx/bell.mp3", // Using a simple bell sound as a placeholder
        volume: -10 // Bell sound louder
      }).toDestination();

      // Wait for both players to be loaded before setting isAudioLoaded to true
      try {
        await Promise.all([
          backgroundPlayerRef.current.loaded,
          bellPlayerRef.current.loaded
        ]);
        setIsAudioLoaded(true);
        console.log("Audio assets loaded successfully.");
      } catch (e) {
        console.error("Error loading audio assets:", e);
        setError("Failed to load audio assets. Please refresh the page.");
      }
    };

    initAudioPlayers();

    return () => {
      // Clean up Tone.js players on unmount
      if (backgroundPlayerRef.current) {
        backgroundPlayerRef.current.dispose();
      }
      if (bellPlayerRef.current) {
        bellPlayerRef.current.dispose();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (bellIntervalRef.current) {
        clearInterval(bellIntervalRef.current);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
        backgroundPlayerRef.current.stop();
      }
      if (bellIntervalRef.current) {
        clearInterval(bellIntervalRef.current);
      }
      // Play final bell only if audio is loaded and context is running
      if (bellPlayerRef.current && bellPlayerRef.current.loaded && isAudioLoaded && Tone.context.state === 'running') {
        bellPlayerRef.current.start();
      } else {
        console.warn("Attempted to play final bell, but audio not loaded or context not running.");
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeLeft, isAudioLoaded]); // Added isAudioLoaded to dependencies

  // Update timeLeft when duration changes
  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);

  // Function to start the meditation timer
  const startTimer = async () => {
    // Prevent starting if audio assets are not yet loaded or if there's an error
    if (!isAudioLoaded || error) {
      setError("Audio assets are still loading or an error occurred. Please wait or refresh.");
      return;
    }

    const contextReady = await ensureAudioContext();
    if (!contextReady) return;

    setIsRunning(true);
    if (backgroundPlayerRef.current && backgroundPlayerRef.current.loaded) { // Ensure player is loaded
      backgroundPlayerRef.current.start();
    } else {
      console.warn("Background player not ready to start.");
    }

    // Play bell every 5 minutes (300 seconds)
    if (bellPlayerRef.current && bellPlayerRef.current.loaded) { // Ensure player is loaded
      bellIntervalRef.current = setInterval(() => {
        if (bellPlayerRef.current.loaded && Tone.context.state === 'running') {
          bellPlayerRef.current.start();
        } else {
          console.warn("Attempted to play interval bell, but audio not loaded or context not running.");
        }
      }, 5 * 60 * 1000); // 5 minutes in milliseconds
    } else {
      console.warn("Bell player not ready for intervals.");
    }
  };

  // Function to pause the meditation timer
  const pauseTimer = () => {
    setIsRunning(false);
    if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
      backgroundPlayerRef.current.stop();
    }
    if (bellIntervalRef.current) {
      clearInterval(bellIntervalRef.current);
    }
  };

  // Function to reset the meditation timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
    if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
      backgroundPlayerRef.current.stop();
    }
    if (bellIntervalRef.current) {
      clearInterval(bellIntervalRef.current);
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Function to call the Gemini API for content generation
  const generateContent = async (prompt, type = 'content') => {
    setIsLoading(true);
    setError('');
    if (type === 'content') {
      setGeneratedContent(''); // Clear previous content for meditation/yoga scripts
      setGeneratedAffirmations(''); // Clear affirmations if generating other content
    } else if (type === 'suggestion') {
      setSuggestedMeditationType(''); // Clear previous suggestion
    } else if (type === 'affirmation') {
      setGeneratedAffirmations(''); // Clear previous affirmations
      setGeneratedContent(''); // Clear other content
    }

    // Stop background music if it's playing (e.g., from a previous yoga session or timer)
    if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
      backgroundPlayerRef.current.stop();
    }

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = { contents: chatHistory };
      const apiKey = ""; // API key is provided by the environment
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error.message || response.statusText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        if (type === 'content') {
          setGeneratedContent(text);
          // If yoga content is generated, start background music
          if (activeTab === 'yoga' && isAudioLoaded) {
            const contextReady = await ensureAudioContext();
            if (!contextReady) return;

            if (backgroundPlayerRef.current && backgroundPlayerRef.current.loaded) {
                backgroundPlayerRef.current.start();
            } else {
                console.warn("Background player not ready to start for yoga music.");
            }
          }
        } else if (type === 'suggestion') {
          setSuggestedMeditationType(text);
        } else if (type === 'affirmation') {
          setGeneratedAffirmations(text);
        }
      } else {
        if (type === 'content') {
          setGeneratedContent("No content generated. Please try a different prompt.");
        } else if (type === 'suggestion') {
          setSuggestedMeditationType("Could not suggest a meditation type. Please try again.");
        } else if (type === 'affirmation') {
          setGeneratedAffirmations("Could not generate affirmations. Please try again.");
        }
      }
    } catch (err) {
      console.error("Error generating content:", err);
      setError(`Failed to generate content: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder for Text-to-Speech functionality
  const readAloud = (text) => {
    console.log("Attempting to read aloud:", text);
    alert("Text-to-Speech functionality is not supported in this environment. In a full application, this button would read the content aloud.");
  };

  // Handle form submission for Yoga
  const handleYogaSubmit = (e) => {
    e.preventDefault();
    if (yogaGoal.trim()) {
      const prompt = `Generate a beginner-friendly yoga sequence (5-7 poses) focusing on "${yogaGoal}". For each pose, include the pose name and 1-2 sentences describing its benefit or how to do it. Format as a numbered list.`;
      generateContent(prompt, 'content');
    } else {
      setError("Please enter a goal for your yoga session.");
    }
  };

  // Handle form submission for Meditation Guide (script generation)
  const handleMeditationGuideSubmit = (e) => {
    e.preventDefault();
    if (meditationGoal.trim()) {
      const prompt = `Write a short (2-3 minute) guided meditation script for "${meditationGoal}". Include instructions for breathing and body awareness.`;
      generateContent(prompt, 'content');
    } else {
      setError("Please enter a goal for your meditation session.");
    }
  };

  // Handle "Check-in" submission
  const handleCheckIn = (e) => {
    e.preventDefault();
    if (checkInState.trim()) {
      const prompt = `Given the state of mind: "${checkInState}", suggest a suitable meditation course or type, and briefly explain why it would be beneficial. Be concise.`;
      generateContent(prompt, 'suggestion');
    } else {
      setError("Please describe your current state of mind.");
    }
  };

  // Handle affirmation generation
  const handleAffirmationSubmit = (e) => {
    e.preventDefault();
    if (affirmationGoal.trim()) {
      const prompt = `Generate 3-5 positive affirmations for someone who wants to feel "${affirmationGoal}". Format as a numbered list.`;
      generateContent(prompt, 'affirmation');
    } else {
      setError("Please enter a goal or feeling for your affirmations.");
    }
  };


  return (
    // Main container with a peaceful nature background and a subtle overlay for readability
    <div
      className="min-h-screen flex flex-col items-center p-4 font-inter bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{ backgroundImage: "url('image_3afa8a.jpg')" }} // Main page background
    >
      {/* Overlay to ensure text readability over the background image */}
      <div className="absolute inset-0 bg-black opacity-30"></div>

      {/* Main content card, positioned above the overlay with z-index */}
      <div
        className="p-8 rounded-xl shadow-2xl max-w-3xl w-full my-8 relative z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('image_3b63a5.jpg')" }} // Content card background
      >
        {/* Inner overlay for content card to ensure text readability over its background image */}
        <div className="absolute inset-0 bg-white opacity-70 rounded-xl"></div>
        <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8 relative z-20">
          AI Yoga & Meditation Guide
        </h1>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8 flex-wrap relative z-20">
          <button
            className={`px-4 py-2 rounded-l-lg font-semibold text-base sm:text-lg transition-all duration-300 ${
              activeTab === 'yoga'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveTab('yoga');
              setGeneratedContent('');
              setGeneratedAffirmations(''); // Clear affirmations
              setError('');
              setYogaGoal('');
              setSuggestedMeditationType('');
              // Stop background music when switching tabs
              if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
                backgroundPlayerRef.current.stop();
              }
            }}
          >
            Yoga Session
          </button>
          <button
            className={`px-4 py-2 font-semibold text-base sm:text-lg transition-all duration-300 ${
              activeTab === 'meditation-guide'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveTab('meditation-guide');
              setGeneratedContent('');
              setGeneratedAffirmations(''); // Clear affirmations
              setError('');
              setMeditationGoal('');
              setSuggestedMeditationType('');
              // Stop background music when switching tabs
              if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
                backgroundPlayerRef.current.stop();
              }
            }}
          >
            Meditation Guide
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg font-semibold text-base sm:text-lg transition-all duration-300 ${
              activeTab === 'meditation-timer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => {
              setActiveTab('meditation-timer');
              setGeneratedContent('');
              setGeneratedAffirmations(''); // Clear affirmations
              setError('');
              setSuggestedMeditationType('');
              // Stop background music when switching tabs
              if (backgroundPlayerRef.current && backgroundPlayerRef.current.state === 'started') {
                backgroundPlayerRef.current.stop();
              }
            }}
          >
            Meditation Timer
          </button>
        </div>

        {/* Yoga Section */}
        {activeTab === 'yoga' && (
          <form onSubmit={handleYogaSubmit} className="space-y-6 relative z-20">
            <label htmlFor="yogaGoal" className="block text-gray-800 text-lg font-medium">
              What's your yoga goal today?
            </label>
            <input
              type="text"
              id="yogaGoal"
              value={yogaGoal}
              onChange={(e) => setYogaGoal(e.target.value)}
              placeholder="e.g., Stress Relief, Flexibility, Morning Energy"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white bg-opacity-80"
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? 'Generating Yoga...' : 'Generate Yoga Sequence'}
            </button>
          </form>
        )}

        {/* Meditation Guide Section (with Check-in and Affirmations) */}
        {activeTab === 'meditation-guide' && (
          <div className="space-y-8 relative z-20">
            {/* Check-in Feature */}
            <form onSubmit={handleCheckIn} className="space-y-4 p-6 bg-gray-50 bg-opacity-80 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Check-in: How are you feeling?</h2>
              <label htmlFor="checkInState" className="block text-gray-800 text-base font-medium">
                Describe your current state of mind:
              </label>
              <input
                type="text"
                id="checkInState"
                value={checkInState}
                onChange={(e) => setCheckInState(e.target.value)}
                placeholder="e.g., Excited, Agitated, Calm, Peaceful, Stressed"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white bg-opacity-80"
              />
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition duration-300 shadow-lg transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? 'Suggesting...' : 'Get Meditation Suggestion'}
              </button>
              {suggestedMeditationType && (
                <div className="mt-4 p-4 bg-purple-100 bg-opacity-80 rounded-lg border border-purple-300 text-gray-800">
                  <h3 className="font-semibold text-purple-800">Suggested Meditation:</h3>
                  <p className="text-purple-700">{suggestedMeditationType}</p>
                </div>
              )}
            </form>

            {/* Personalized Affirmations/Mantras Feature */}
            <form onSubmit={handleAffirmationSubmit} className="space-y-4 p-6 bg-green-50 bg-opacity-80 rounded-lg border border-green-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">✨ Personalized Affirmations</h2>
              <label htmlFor="affirmationGoal" className="block text-gray-800 text-base font-medium">
                What feeling or goal do you want affirmations for?
              </label>
              <input
                type="text"
                id="affirmationGoal"
                value={affirmationGoal}
                onChange={(e) => setAffirmationGoal(e.target.value)}
                placeholder="e.g., Confidence, Calmness, Self-love, Success"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 bg-white bg-opacity-80"
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition duration-300 shadow-lg transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Affirmations'}
              </button>
              {generatedAffirmations && (
                <div className="mt-4 p-4 bg-green-100 bg-opacity-80 rounded-lg border border-green-300 text-gray-800">
                  <h3 className="font-semibold text-green-800">Your Affirmations:</h3>
                  <div className="prose max-w-none text-gray-800 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                    {generatedAffirmations}
                  </div>
                </div>
              )}
            </form>

            {/* Meditation Script Generation */}
            <form onSubmit={handleMeditationGuideSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Generate a Guided Meditation Script</h2>
              <label htmlFor="meditationGoal" className="block text-gray-800 text-lg font-medium">
                What's your meditation goal today? (e.g., based on suggestion above)
              </label>
              <input
                type="text"
                id="meditationGoal"
                value={meditationGoal}
                onChange={(e) => setMeditationGoal(e.target.value)}
                placeholder="e.g., Calm, Focus, Better Sleep, or your suggested type"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white bg-opacity-80"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? 'Generating Script...' : 'Generate Meditation Script'}
              </button>
            </form>
          </div>
        )}

        {/* Meditation Timer Section */}
        {activeTab === 'meditation-timer' && (
          <div className="space-y-6 text-center relative z-20">
            <h2 className="2xl font-bold text-gray-800 mb-4">Meditation Timer</h2>
            <div className="flex items-center justify-center space-x-4 mb-6">
              <label htmlFor="duration" className="text-lg font-medium text-gray-800">Duration (minutes):</label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => {
                  const newDuration = Math.max(1, parseInt(e.target.value, 10) || 1); // Min 1 minute
                  setDuration(newDuration);
                  if (!isRunning) { // Only reset time if not running
                    setTimeLeft(newDuration * 60);
                  }
                }}
                min="1"
                className="w-24 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 transition duration-200 bg-white bg-opacity-80"
              />
            </div>

            <div className="text-7xl font-extrabold text-indigo-700 mb-8 select-none">
              {formatTime(timeLeft)}
            </div>

            <div className="flex justify-center space-x-4">
              {!isRunning ? (
                <button
                  onClick={startTimer}
                  className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:scale-105"
                  disabled={!isAudioLoaded} // Disable button until audio is loaded
                >
                  {isAudioLoaded ? 'Start' : 'Loading Audio...'}
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Pause
                </button>
              )}
              <button
                onClick={resetTimer}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:scale-105"
              >
                Reset
              </button>
            </div>
            <p className="text-sm text-gray-800 mt-4">Background music and Tibetan bells will play during the session.</p>
            {!isAudioLoaded && (
              <p className="text-sm text-red-500 mt-2">Please wait for audio assets to load before starting the timer.</p>
            )}
          </div>
        )}

        {/* Display Area for Generated Content (Yoga/Meditation Scripts) */}
        {generatedContent && (
          <div className="mt-8 p-6 bg-blue-50 bg-opacity-80 rounded-lg border border-blue-200 shadow-inner relative z-20">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">Your Personalized Content:</h2>
            <div className="prose max-w-none text-gray-800 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {generatedContent}
            </div>
            <button
              onClick={() => readAloud(generatedContent)}
              className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:scale-105"
            >
              Read Aloud
            </button>
            <p className="text-sm text-gray-800 mt-2">
              Note: Actual text-to-speech is not supported in this environment. This button demonstrates where the feature would be implemented.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-100 bg-opacity-80 border border-red-400 text-red-700 rounded-lg relative z-20">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
