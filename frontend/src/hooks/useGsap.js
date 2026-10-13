"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function useGsapFadeIn(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || typeof window === "undefined") return;
    
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { y: options.y ?? 24, opacity: 0.2 },
        {
          y: 0,
          opacity: 1,
          duration: options.duration ?? 0.6,
          delay: options.delay ?? 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => ctx.revert();
  }, [options.y, options.duration, options.delay]);

  return ref;
}

export function useGsapStagger(selector, options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        selector,
        { y: options.y ?? 24, opacity: 0.3 },
        {
          y: 0,
          opacity: 1,
          duration: options.duration ?? 0.6,
          stagger: options.stagger ?? 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [selector, options.y, options.duration, options.stagger]);

  return containerRef;
}
