"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Group, Mesh } from "three";

function Paper({ position, rotation, width, tint, delay }: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  tint: string;
  delay: number;
}) {
  const panel = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (panel.current) panel.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.55 + delay) * 0.035;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh ref={panel} castShadow>
        <planeGeometry args={[width, width * 1.36]} />
        <meshPhysicalMaterial color={tint} transparent opacity={0.19} roughness={0.19} metalness={0.18} transmission={0.26} thickness={0.4} side={2} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width * .84, width * 1.2]} />
        <meshBasicMaterial color="#a8b7ff" transparent opacity={0.035} side={2} />
      </mesh>
      {Array.from({ length: 6 }).map((_, index) => (
        <mesh key={index} position={[-width * .27, width * (.27 - index * .11), .022]}>
          <planeGeometry args={[width * (index === 0 ? .43 : .57 - (index % 2) * .1), .012]} />
          <meshBasicMaterial color={index === 0 ? "#a99cff" : "#c4d2ec"} transparent opacity={index === 0 ? .65 : .24} />
        </mesh>
      ))}
    </group>
  );
}

function Room() {
  const group = useRef<Group>(null);
  const scrollProgress = useRef(0);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const progress = { value: 0 };
    const tween = gsap.to(progress, {
      value: 1,
      ease: "none",
      scrollTrigger: { trigger: "#workflow", start: "top bottom", end: "bottom top", scrub: 1 },
      onUpdate: () => { scrollProgress.current = progress.value; },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);
  useFrame(({ pointer, clock, camera }) => {
    if (group.current) {
      const progress = scrollProgress.current;
      group.current.rotation.y += ((pointer.x * .12 + Math.sin(clock.elapsedTime * .17) * .04 + progress * .72) - group.current.rotation.y) * .025;
      group.current.rotation.x += ((-pointer.y * .075 - progress * .1) - group.current.rotation.x) * .025;
      camera.position.z += ((5.2 - progress * .42) - camera.position.z) * .02;
    }
  });
  const sheets: Array<{ position: [number, number, number]; rotation: [number, number, number]; width: number; tint: string; delay: number }> = [
    { position: [-.88, .18, -.35], rotation: [0, -.2, -.035], width: 1.35, tint: "#9b8cff", delay: 0 },
    { position: [-.28, -.02, .25], rotation: [0, .14, .02], width: 1.48, tint: "#7284ff", delay: 1.2 },
    { position: [.42, .17, -.08], rotation: [0, -.1, -.02], width: 1.42, tint: "#54d9e8", delay: 2 },
    { position: [.98, -.13, -.42], rotation: [0, .17, .03], width: 1.22, tint: "#8d8cff", delay: 2.7 },
    { position: [.05, .6, -.55], rotation: [0, .02, -.08], width: 1.12, tint: "#84a6ff", delay: 3.4 },
    { position: [-.22, -.62, -.32], rotation: [0, -.04, .06], width: 1.18, tint: "#6bdbe8", delay: 4.1 },
  ];
  return (
    <group ref={group}>
      <Float speed={.55} rotationIntensity={.08} floatIntensity={.15}>
        {sheets.map((sheet) => <Paper key={sheet.delay} {...sheet} />)}
      </Float>
      <mesh position={[0, 0, -.8]}>
        <torusGeometry args={[1.65, .006, 8, 120]} />
        <meshBasicMaterial color="#7a70ff" transparent opacity={.38} />
      </mesh>
      <Sparkles count={85} scale={[5.8, 4.5, 3]} size={1.5} speed={.14} color="#b6c8ff" opacity={.55} />
    </group>
  );
}

export default function HeroScene() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    setEnabled(!reduced && !lowPower);
  }, []);
  if (!enabled) return <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_40%,rgba(108,92,231,.18),transparent_52%)]" />;
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5.2], fov: 40 }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.4} />
          <pointLight position={[3, 3, 4]} intensity={3.5} color="#8274ff" />
          <pointLight position={[-3, -1, 2]} intensity={2} color="#36cde2" />
          <Room />
        </Suspense>
      </Canvas>
    </div>
  );
}
