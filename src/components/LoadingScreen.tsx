import { useState, useEffect } from "react";
import logo from "@/assets/logo.jpg";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      // Start fade out animation
      setTimeout(() => {
        setFadeOut(true);
        // Call onLoadingComplete after fade animation
        setTimeout(() => {
          onLoadingComplete();
        }, 500);
      }, 300);
    }
  }, [progress, onLoadingComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo with animation */}
        <div className="relative animate-fade-in">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary via-accent to-primary blur-2xl opacity-60 animate-pulse" style={{ transform: "scale(1.3)" }} />
          
          {/* Logo */}
          <img
            src={logo}
            alt="AppleTechStore"
            className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-3xl object-cover shadow-2xl border-2 border-white/20"
          />
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white animate-fade-in" style={{ animationDelay: "0.2s" }}>
          AppleTechStore
        </h1>

        {/* Loading Bar Container */}
        <div className="w-48 sm:w-64 md:w-80 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {/* Progress bar background */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            {/* Progress bar fill */}
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer bg-[length:200%_100%]" />
            </div>
          </div>

          {/* Loading text */}
          <p className="text-center text-white/60 text-sm mt-4 animate-pulse">
            Loading...
          </p>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
