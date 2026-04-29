"use client";

import { useState, useEffect, useRef } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull to refresh if we are at the top of the container
      if (window.scrollY === 0) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Resistance effect: pull slower as it gets longer
        const distance = Math.min(diff * 0.4, MAX_PULL);
        setPullDistance(distance);
        
        // Prevent default scrolling when pulling down at the top
        if (distance > 5) {
          if (e.cancelable) e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;
      isPulling.current = false;

      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} style={{ position: "relative", minHeight: "100%" }}>
      {/* Visual Indicator */}
      <div 
        style={{ 
          position: "absolute", 
          top: `${pullDistance - 40}px`, 
          left: "50%", 
          transform: `translateX(-50%) rotate(${pullDistance * 3}deg) scale(${Math.min(pullDistance / PULL_THRESHOLD, 1)})`,
          opacity: Math.min(pullDistance / 20, 1),
          zIndex: 100,
          background: "hsl(var(--bg-elevated))",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-md)",
          border: "1px solid hsl(var(--border))",
          transition: isRefreshing ? "none" : "top 0.2s ease, transform 0.1s linear, opacity 0.2s ease",
          pointerEvents: "none"
        }}
      >
        <div 
          className={isRefreshing ? "animate-spin" : ""}
          style={{ 
            width: "20px", 
            height: "20px", 
            border: "3px solid hsl(var(--primary) / 0.2)", 
            borderTopColor: "hsl(var(--primary))", 
            borderRadius: "50%" 
          }} 
        />
      </div>

      {/* Content wrapper with transition */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance * 0.5}px)`,
          transition: isPulling.current ? "none" : "transform 0.3s cubic-bezier(0.2, 0, 0, 1)"
        }}
      >
        {children}
      </div>
    </div>
  );
}
