import React, { useState, useEffect, useRef } from 'react';

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

  // Native audio players
  const backgroundPlayerRef = useRef(null);
  const bellPlayerRef = useRef(null);
  const bellIntervalRef = useRef(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Function to ensure audio context is running
  const unlockAudio = () => {
    if (!audioUnlocked) {
      // Play and immediately pause to unlock audio on user gesture
      if (backgroundPlayerRef.current) {
        backgroundPlayerRef.current.play().then(() => {
          backgroundPlayerRef.current.pause();
          backgroundPlayerRef.current.currentTime = 0;
        });
      }
      if (bellPlayerRef.current) {
        bellPlayerRef.current.play().then(() => {
          bellPlayerRef.current.pause();
          bellPlayerRef.current.currentTime = 0;
        });
      }
      setAudioUnlocked(true);
    }
  };

  // Initialize audio players on component mount
  useEffect(() => {
    // Use remote audio, but fallback to local if it fails to load in 5 seconds
    let fallbackTimeout;
    let remoteLoaded = false;
    backgroundPlayerRef.current = new window.Audio("https://cdn.pixabay.com/audio/2022/10/16/audio_12b6b7b6b2.mp3");
    backgroundPlayerRef.current.loop = true;
    backgroundPlayerRef.current.volume = 0.3;
    bellPlayerRef.current = new window.Audio("https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7b2.mp3");
    bellPlayerRef.current.volume = 0.7;

    // If remote loads, clear fallback
    backgroundPlayerRef.current.oncanplaythrough = () => {
      remoteLoaded = true;
      clearTimeout(fallbackTimeout);
      if (bellPlayerRef.current.readyState >= 3) setIsAudioLoaded(true);
    };
    bellPlayerRef.current.oncanplaythrough = () => {
      if (backgroundPlayerRef.current.readyState >= 3) setIsAudioLoaded(true);
    };

    // Fallback to local after 5 seconds if not loaded
    fallbackTimeout = setTimeout(() => {
      if (!remoteLoaded) {
        backgroundPlayerRef.current = new window.Audio("/meditation-yoga-relaxing-music-371413.mp3");
        backgroundPlayerRef.current.loop = true;
        backgroundPlayerRef.current.volume = 0.3;
        backgroundPlayerRef.current.oncanplaythrough = () => {
          if (bellPlayerRef.current.readyState >= 3) setIsAudioLoaded(true);
        };
        backgroundPlayerRef.current.onerror = () => {
          setError("Failed to load both remote and local background music.");
        };
        backgroundPlayerRef.current.load();
      }
    }, 5000);

    backgroundPlayerRef.current.load();
    bellPlayerRef.current.load();

    return () => {
      if (backgroundPlayerRef.current) {
        backgroundPlayerRef.current.pause();
        backgroundPlayerRef.current.currentTime = 0;
      }
      if (bellPlayerRef.current) {
        bellPlayerRef.current.pause();
        bellPlayerRef.current.currentTime = 0;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (bellIntervalRef.current) clearInterval(bellIntervalRef.current);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (backgroundPlayerRef.current) {
        backgroundPlayerRef.current.pause();
        backgroundPlayerRef.current.currentTime = 0;
      }
      if (bellIntervalRef.current) clearInterval(bellIntervalRef.current);
      // Play final bell
      if (bellPlayerRef.current && isAudioLoaded) {
        bellPlayerRef.current.currentTime = 0;
        bellPlayerRef.current.play();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeLeft, isAudioLoaded]);

  // Update timeLeft when duration changes
  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);

  // Function to start the meditation timer
  const startTimer = () => {
    if (!isAudioLoaded || error) {
      setError("Audio assets are still loading or an error occurred. Please wait or refresh.");
      return;
    }
    if (!audioUnlocked) {
      setError("Please click the 'Test Sound' button to enable audio before starting.");
      return;
    }
    setIsRunning(true);
    if (backgroundPlayerRef.current) {
      backgroundPlayerRef.current.currentTime = 0;
      backgroundPlayerRef.current.play();
    }
    // Play bell every 5 minutes
    if (bellPlayerRef.current) {
      bellIntervalRef.current = setInterval(() => {
        bellPlayerRef.current.currentTime = 0;
        bellPlayerRef.current.play();
      }, 5 * 60 * 1000);
    }
  };

  // Function to pause the meditation timer
  const pauseTimer = () => {
    setIsRunning(false);
    if (backgroundPlayerRef.current) {
      backgroundPlayerRef.current.pause();
    }
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current);
  };

  // Function to reset the meditation timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
    if (backgroundPlayerRef.current) {
      backgroundPlayerRef.current.pause();
      backgroundPlayerRef.current.currentTime = 0;
    }
    if (bellIntervalRef.current) clearInterval(bellIntervalRef.current);
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
      const apiKey = "AIzaSyDEFnGjh4oCsTVR3AXzB4PE2yFjvNCv9rw"; // API key is provided by the environment
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
            backgroundPlayerRef.current.play();
          }
          // Automatically start reading the generated content
          setTimeout(() => readAloud(text), 500); // Small delay to ensure content is set
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

  // State for tracking if text-to-speech is playing
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Real Text-to-Speech functionality using Web Speech API
  const readAloud = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      
      // Set up event listeners to track speech state
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser does not support text-to-speech.");
    }
  };

  // Function to stop text-to-speech
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
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
      style={{ backgroundImage: "url('/pexels-cmonphotography-1809644.jpg')" }} // Main page background
    >
      {/* Overlay to ensure text readability over the background image */}
      <div className="absolute inset-0 bg-black opacity-30"></div>

      {/* Main content card, positioned above the overlay with z-index */}
      <div
        className="main-card"
        style={{ backgroundImage: "url('image_3b63a5.jpg')" }} // Content card background
      >
        {/* Inner overlay for content card to ensure text readability over its background image */}
        <div className="absolute inset-0 bg-white opacity-70 rounded-xl"></div>
        <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8 relative z-20">
        Mindful AI Guide
        </h1>

        {/* Tab Navigation */}
        <div className="tab-buttons">
          <button
            className={`tab-btn${activeTab === 'yoga' ? ' active' : ''}`}
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
            className={`tab-btn${activeTab === 'meditation-guide' ? ' active' : ''}`}
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
            className={`tab-btn${activeTab === 'meditation-timer' ? ' active' : ''}`}
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
          <div className="meditation-timer-section">
            <button
              style={{ marginBottom: 16, background: '#4636d6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(60,60,120,0.10)' }}
              onClick={unlockAudio}
              disabled={!isAudioLoaded || audioUnlocked}
            >
              {audioUnlocked ? 'Audio Ready!' : 'Test Sound'}
            </button>
            <div className="meditation-timer-title">Meditation Timer</div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <label htmlFor="duration" className="meditation-timer-label">Duration (minutes):</label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => {
                  const newDuration = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setDuration(newDuration);
                  if (!isRunning) {
                    setTimeLeft(newDuration * 60);
                  }
                }}
                min="1"
                className="meditation-timer-input"
              />
            </div>
            <div className="meditation-timer-time">{formatTime(timeLeft)}</div>
            <div className="meditation-timer-controls">
              {!isRunning ? (
                <button
                  onClick={startTimer}
                  className="meditation-timer-btn start"
                  disabled={!isAudioLoaded}
                >
                  {isAudioLoaded ? 'Start' : 'Loading Audio...'}
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="meditation-timer-btn start"
                  style={{ background: '#fbc02d' }}
                >
                  Pause
                </button>
              )}
              <button
                onClick={resetTimer}
                className="meditation-timer-btn reset"
              >
                Reset
              </button>
            </div>
            <div className="meditation-timer-note">
              Background music and Tibetan bells will play during the session.
            </div>
            {!isAudioLoaded && (
              <div style={{ color: '#e53935', fontSize: '1rem', marginTop: 8 }}>
                Please wait for audio assets to load before starting the timer.
              </div>
            )}
          </div>
        )}

        {/* Display Area for Generated Content (Yoga/Meditation Scripts) */}
        {generatedContent && (
          <div className="generated-content">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">Your Personalized Content:</h2>
            <div className="prose max-w-none text-gray-800 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {generatedContent}
            </div>
            <button
              onClick={isSpeaking ? stopSpeaking : () => readAloud(generatedContent)}
              className={`mt-4 px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-300 ease-in-out transform hover:scale-105 ${
                isSpeaking 
                  ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600'
              }`}
            >
              {isSpeaking ? 'Stop' : 'Read Aloud'}
            </button>
            <p className="text-sm text-gray-800 mt-2">
              Note: Actual text-to-speech is not supported in this environment. This button demonstrates where the feature would be implemented.
            </p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
