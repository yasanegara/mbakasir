"use client";

import { useState, useEffect, useRef } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * MBAKASIR INTELLIGENCE PRO — PREMIUM PULL TO REFRESH
 * Optimized for 120Hz displays, iPads, and high-sensitivity mobile screens.
 */
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  
  const startY = useRef(0);
  const currentPull = useRef(0);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 90;
  const MAX_PULL = 150;
  const FRICTION = 0.45; // Smooth resistance

  useEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    const content = contentRef.current;
    const spinner = spinnerRef.current;
    
    if (!container || !indicator || !content || !spinner) return;

    const updateVisuals = (distance: number) => {
      const opacity = Math.min(distance / (PULL_THRESHOLD * 0.7), 1);
      const scale = Math.min(distance / PULL_THRESHOLD, 1);
      const rotate = distance * 2.5;
      const translateY = distance * 0.5;

      // Direct DOM manipulation for maximum smoothness (bypassing React render cycle)
      indicator.style.opacity = `${opacity}`;
      indicator.style.transform = `translateX(-50%) translateY(${distance}px) rotate(${rotate}deg) scale(${scale})`;
      content.style.transform = `translateY(${translateY}px)`;

      // Change spinner border-top color if threshold reached
      if (distance >= PULL_THRESHOLD) {
        spinner.style.borderTopColor = "hsl(var(--success))";
        if (distance === PULL_THRESHOLD && !isRefreshing) {
           // Subtle haptic if supported
           if ("vibrate" in navigator) navigator.vibrate(5);
        }
      } else {
        spinner.style.borderTopColor = "hsl(var(--primary))";
      }
    };

    const resetVisuals = (animate = true) => {
      if (animate) {
        indicator.style.transition = "all 0.4s cubic-bezier(0.19, 1, 0.22, 1)";
        content.style.transition = "transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)";
      } else {
        indicator.style.transition = "none";
        content.style.transition = "none";
      }
      
      indicator.style.opacity = "0";
      indicator.style.transform = "translateX(-50%) translateY(0px) rotate(0deg) scale(0)";
      content.style.transform = "translateY(0px)";
      currentPull.current = 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger at the very top of the page
      if (window.scrollY <= 5 && !isRefreshing) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
        
        // Disable transitions during pull
        indicator.style.transition = "none";
        content.style.transition = "none";
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Logarithmic-like resistance for natural feel
        const distance = Math.min(diff * FRICTION, MAX_PULL);
        currentPull.current = distance;
        
        updateVisuals(distance);

        // Prevent system pull-to-refresh and unwanted scrolling
        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else if (diff < 0) {
        // If user scrolls up, abort pull
        isPulling.current = false;
        resetVisuals();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;
      isPulling.current = false;

      const finalDistance = currentPull.current;

      if (finalDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        
        // Snap to refresh position
        indicator.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        content.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        
        indicator.style.transform = `translateX(-50%) translateY(${PULL_THRESHOLD * 0.8}px) scale(1)`;
        content.style.transform = `translateY(${PULL_THRESHOLD * 0.4}px)`;
        
        // Trigger Haptic
        if ("vibrate" in navigator) navigator.vibrate([10, 30, 10]);

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          resetVisuals();
        }
      } else {
        resetVisuals();
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isRefreshing, onRefresh]);

  return (
    <div 
      ref={containerRef} 
      className="ptr-container"
      style={{ 
        position: "relative", 
        minHeight: "100%",
        touchAction: "pan-x pan-y pinch-zoom" // Better gesture control
      }}
    >
      {/* Visual Indicator (Spinner) */}
      <div 
        ref={indicatorRef}
        className="ptr-indicator"
        style={{ 
          position: "fixed", 
          top: "10px", 
          left: "50%", 
          transform: "translateX(-50%) scale(0)",
          opacity: 0,
          zIndex: 9999,
          background: "hsl(var(--bg-elevated))",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 15px rgba(0,0,0,0.25), var(--shadow-glow-primary)",
          border: "1px solid hsl(var(--border-light))",
          pointerEvents: "none",
          willChange: "transform, opacity"
        }}
      >
        <div 
          ref={spinnerRef}
          className={isRefreshing ? "animate-spin" : ""}
          style={{ 
            width: "22px", 
            height: "22px", 
            border: "3px solid hsl(var(--text-muted) / 0.15)", 
            borderTopColor: "hsl(var(--primary))", 
            borderRadius: "50%",
            transition: "border-color 0.2s ease"
          }} 
        />
      </div>

      {/* Content wrapper */}
      <div 
        ref={contentRef}
        className="ptr-content"
        style={{ 
          willChange: "transform"
        }}
      >
        {children}
      </div>

      <style jsx global>{`
        .ptr-container {
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        @keyframes ptr-spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: ptr-spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
