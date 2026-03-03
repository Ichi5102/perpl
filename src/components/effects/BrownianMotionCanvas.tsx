"use client";

import { useEffect, useRef } from "react";
import { Artist } from "@/components/dashboard/PlaylistCreatorTile";

interface Particle {
    x: number;
    baseY: number;
    size: number;
    speedX: number;
    phaseOffset: number;
    artistIndex: number;
}

interface BrownianMotionCanvasProps {
    artists: Artist[];
    isAddMode?: boolean;
    isGenerating?: boolean;
}

export function BrownianMotionCanvas({ artists, isAddMode = false, isGenerating = false }: BrownianMotionCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>(0);
    const particles = useRef<Particle[]>([]);

    // Track generating state without resetting the canvas loop
    const isGeneratingRef = useRef(isGenerating);

    useEffect(() => {
        isGeneratingRef.current = isGenerating;
    }, [isGenerating]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize handler
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Pre-parse artist colors to avoid doing it per particle per frame
        // Baseline ocean color: Cyan for Replace, Purple for Add
        const baseColor = isAddMode ? "rgba(168, 85, 247, 0.6)" : "rgba(6, 182, 212, 0.6)";
        const rgbColors = [baseColor, ...artists.map(artist => {
            let r = 255, g = 255, b = 255;
            const hslMatch = artist.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
                const h = parseInt(hslMatch[1]) / 360;
                const s = parseInt(hslMatch[2]) / 100;
                const l = parseInt(hslMatch[3]) / 100;
                const hue2rgb = (p: number, q: number, t: number) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
                g = Math.round(hue2rgb(p, q, h) * 255);
                b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
            }
            return `rgba(${r}, ${g}, ${b}, 0.8)`;
        })];

        const PARTICLES_PER_COLOR = 120;
        const EXPECTED_COUNT = rgbColors.length * PARTICLES_PER_COLOR;

        // Animation Loop
        let lastTime = performance.now();

        const render = (time: number) => {
            const dt = (time - lastTime) / 1000; // delta time in seconds
            lastTime = time;

            const isGen = isGeneratingRef.current;
            const effectiveDt = isGen ? dt * 100 : dt;

            // Clear canvas completely for crisp particle rendering (or slight trail)
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Initialize or rebuild particle grid if element count changes (but not while generating)
            if (!isGen && (particles.current.length !== EXPECTED_COUNT || lastTime < 1000 + (isGen ? 0 : 0))) {
                particles.current = [];
                rgbColors.forEach((_, artistIndex) => {
                    for (let i = 0; i < PARTICLES_PER_COLOR; i++) {
                        particles.current.push({
                            x: Math.random() * canvas.width,
                            // Concentrate base Y around the lower-middle part, or evenly spread
                            baseY: canvas.height * 0.4 + Math.random() * (canvas.height * 0.4),
                            size: Math.random() * 1.5 + 1.0,
                            speedX: Math.random() * 15 + 10, // Drift leftward
                            phaseOffset: Math.random() * Math.PI * 2,
                            // Explicitly map these 120 particles to this specific color index
                            artistIndex: artistIndex
                        });
                    }
                });
            }

            const t = (isGen ? time * 10 : time) / 1000; // time in seconds for smooth wave calculation

            // Update and draw particles iteratively from the end so we can splice cleanly
            for (let i = particles.current.length - 1; i >= 0; i--) {
                const p = particles.current[i];

                // Drift X
                p.x -= p.speedX * effectiveDt;
                if (p.x < 0) {
                    p.x = canvas.width;
                    p.baseY = canvas.height * 0.4 + Math.random() * (canvas.height * 0.4);
                }

                // Separate function for smallest particles (Cosine/Sine switch)
                const isSmall = p.size < 1.5;
                const waveFunction = isSmall ? Math.cos : Math.sin;

                // Ocean Wave Math (Overlapping Waves)
                // wave1: long, slow swell
                const wave1 = waveFunction(p.x * 0.01 + t * 0.8 + p.phaseOffset) * 20;
                // wave2: medium rolling wave
                const wave2 = waveFunction(p.x * 0.02 - t * 1.5) * 10;
                // wave3: localized ripple
                const wave3 = waveFunction(p.x * 0.05 + t * 2.5 + p.phaseOffset * 2) * 5;

                const y = p.baseY + wave1 + wave2 + wave3;

                // Pick color reliably based on its artistIndex so it doesn't flicker
                const color = rgbColors[p.artistIndex % rgbColors.length];

                // Draw Particle
                ctx.beginPath();
                ctx.arc(p.x, y, p.size, 0, Math.PI * 2);

                ctx.fillStyle = color;

                // Add soft colored glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = color;

                ctx.fill();

                ctx.shadowBlur = 0;
            }

            animationFrameId.current = requestAnimationFrame(render);
        };

        animationFrameId.current = requestAnimationFrame(render);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [artists, isAddMode]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full absolute inset-0 z-0 select-none pointer-events-none"
        />
    );
}
