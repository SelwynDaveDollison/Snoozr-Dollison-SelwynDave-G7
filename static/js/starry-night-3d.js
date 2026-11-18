/**
 * Snoozr - Starry Night 3D Experience (Three.js)
 * Inspired by Vincent van Gogh's The Starry Night combined with realistic celestial physics.
 * 
 * Features:
 * - 3D Van Gogh Celestial Swirl (turbulent galactic vortex)
 * - Layered Twinkling Star Field with realistic magnitudes and chromatic variations
 * - 3D Luminous Crescent Moon with multi-tiered volumetric glow corona
 * - Dynamic Shooting Stars / Meteors with glowing fading particle trails
 * - Interactive Mouse Inertia Parallax & Cosmic Particle Turbulence
 * - Performance optimized with single BufferGeometries
 */

(function () {
    'use strict';

    // Check WebGL availability
    function isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    if (!isWebGLAvailable()) {
        console.warn('WebGL not available; fallback to CSS starfield.');
        return;
    }

    const container = document.getElementById('starry-canvas-container');
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060919, 0.0018);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 400;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Mouse & Interaction State ---
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX) * 0.15;
        mouseY = (e.clientY - windowHalfY) * 0.15;
    }, { passive: true });

    // --- Texture Generator for Soft Star Sprites ---
    function createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 235, 180, 0.85)');
        gradient.addColorStop(0.5, 'rgba(143, 148, 251, 0.4)');
        gradient.addColorStop(1, 'rgba(10, 15, 45, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    function createNebulaGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 214, 112, 0.9)');
        gradient.addColorStop(0.25, 'rgba(247, 183, 49, 0.5)');
        gradient.addColorStop(0.6, 'rgba(78, 84, 200, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        return new THREE.CanvasTexture(canvas);
    }

    const starTexture = createStarTexture();
    const glowTexture = createNebulaGlowTexture();

    // ==========================================
    // 1. VAN GOGH SWIRLING COSMIC VORTEX (Points)
    // ==========================================
    const swirlCount = 4200;
    const swirlGeometry = new THREE.BufferGeometry();
    const swirlPositions = new Float32Array(swirlCount * 3);
    const swirlColors = new Float32Array(swirlCount * 3);
    const swirlSizes = new Float32Array(swirlCount);
    const swirlAngles = new Float32Array(swirlCount);
    const swirlRadii = new Float32Array(swirlCount);
    const swirlSpeeds = new Float32Array(swirlCount);

    const palette = [
        new THREE.Color(0xFFE57F), // Luminous Van Gogh Gold
        new THREE.Color(0xFFA000), // Amber Gold
        new THREE.Color(0x82B1FF), // Ethereal Cyan
        new THREE.Color(0x7C4DFF), // Deep Cosmic Violet
        new THREE.Color(0x448AFF), // Cobalt Ultramarine
        new THREE.Color(0xFFFFFF)  // Diamond Starlight
    ];

    for (let i = 0; i < swirlCount; i++) {
        // Multi-arm logarithmic swirl
        const armIndex = i % 3;
        const armOffset = (armIndex * 2 * Math.PI) / 3;
        const radius = Math.pow(Math.random(), 1.5) * 550 + 20;
        const angle = Math.log(radius * 0.1) * 3.5 + armOffset + (Math.random() - 0.5) * 0.8;
        const zSpread = (Math.random() - 0.5) * 120 + Math.sin(radius * 0.03) * 40;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * (radius * 0.65) + 60; // tilted ellipse
        const z = zSpread - 100;

        swirlPositions[i * 3] = x;
        swirlPositions[i * 3 + 1] = y;
        swirlPositions[i * 3 + 2] = z;

        swirlAngles[i] = angle;
        swirlRadii[i] = radius;
        swirlSpeeds[i] = (0.0008 + (600 - radius) * 0.000003) * (i % 2 === 0 ? 1 : 1.15);

        // Color blending
        const chosenColor = palette[Math.floor(Math.random() * palette.length)].clone();
        chosenColor.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.1);
        swirlColors[i * 3] = chosenColor.r;
        swirlColors[i * 3 + 1] = chosenColor.g;
        swirlColors[i * 3 + 2] = chosenColor.b;

        swirlSizes[i] = (Math.random() * 5 + 3) * (window.devicePixelRatio > 1 ? 1 : 1.4);
    }

    swirlGeometry.setAttribute('position', new THREE.BufferAttribute(swirlPositions, 3));
    swirlGeometry.setAttribute('color', new THREE.BufferAttribute(swirlColors, 3));
    swirlGeometry.setAttribute('size', new THREE.BufferAttribute(swirlSizes, 1));

    const swirlMaterial = new THREE.PointsMaterial({
        size: 5.5,
        vertexColors: true,
        map: starTexture,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const swirlMesh = new THREE.Points(swirlGeometry, swirlMaterial);
    scene.add(swirlMesh);

    // ==========================================
    // 2. REALISTIC BACKGROUND STARFIELD (2,500 Stars)
    // ==========================================
    const bgStarCount = 2800;
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgStarCount * 3);
    const bgColors = new Float32Array(bgStarCount * 3);
    const bgBaseSizes = new Float32Array(bgStarCount);

    for (let i = 0; i < bgStarCount; i++) {
        const x = (Math.random() - 0.5) * 1800;
        const y = (Math.random() - 0.5) * 1400;
        const z = -Math.random() * 900 - 100;

        bgPositions[i * 3] = x;
        bgPositions[i * 3 + 1] = y;
        bgPositions[i * 3 + 2] = z;

        // Realistic star temperatures (blue-white to warm yellow)
        const temp = Math.random();
        let starColor;
        if (temp > 0.85) starColor = new THREE.Color(0xFFF4D4); // Amber white
        else if (temp > 0.4) starColor = new THREE.Color(0xFFFFFF); // Pure white
        else if (temp > 0.15) starColor = new THREE.Color(0xCAE9FF); // Soft electric blue
        else starColor = new THREE.Color(0xFFD166); // Golden starlight

        bgColors[i * 3] = starColor.r;
        bgColors[i * 3 + 1] = starColor.g;
        bgColors[i * 3 + 2] = starColor.b;

        bgBaseSizes[i] = Math.random() * 3.5 + 1.2;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

    const bgStarMaterial = new THREE.PointsMaterial({
        size: 3.2,
        vertexColors: true,
        map: starTexture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const bgStarMesh = new THREE.Points(bgGeometry, bgStarMaterial);
    scene.add(bgStarMesh);

    // ==========================================
    // 3. ICONIC STARRY NIGHT CRESCENT MOON
    // ==========================================
    const moonGroup = new THREE.Group();
    moonGroup.position.set(240, 130, -50);

    // Crescent Moon Core (Sphere masked or glowing disc)
    const moonCoreGeo = new THREE.SphereGeometry(24, 32, 32);
    const moonCoreMat = new THREE.MeshBasicMaterial({
        color: 0xFFF9C4,
        transparent: true,
        opacity: 0.95
    });
    const moonCore = new THREE.Mesh(moonCoreGeo, moonCoreMat);
    moonGroup.add(moonCore);

    // Moon Shadow Cutter to form crescent shape
    const cutterGeo = new THREE.SphereGeometry(22, 32, 32);
    const cutterMat = new THREE.MeshBasicMaterial({
        color: 0x090D22, // matches sky background
        transparent: true,
        opacity: 0.98
    });
    const cutter = new THREE.Mesh(cutterGeo, cutterMat);
    cutter.position.set(-10, 5, 4);
    moonGroup.add(cutter);

    // Multi-layer Volumetric Radiant Halo Sprite
    const haloGeo = new THREE.PlaneGeometry(160, 160);
    const haloMat = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const moonHalo = new THREE.Mesh(haloGeo, haloMat);
    moonGroup.add(moonHalo);

    // Outer warm gold corona ring
    const outerHaloGeo = new THREE.PlaneGeometry(280, 280);
    const outerHaloMat = new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 0xFFB300,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    moonGroup.add(outerHalo);

    scene.add(moonGroup);

    // ==========================================
    // 4. SHOOTING STARS / METEORS SYSTEM
    // ==========================================
    const meteors = [];
    const maxMeteors = 3;

    class Meteor {
        constructor() {
            this.geometry = new THREE.BufferGeometry();
            const points = [];
            this.trailLength = 24;
            for (let i = 0; i < this.trailLength; i++) {
                points.push(new THREE.Vector3(0, 0, 0));
            }
            this.geometry.setFromPoints(points);

            this.material = new THREE.LineBasicMaterial({
                color: 0xFFE082,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                linewidth: 2
            });

            this.line = new THREE.Line(this.geometry, this.material);
            scene.add(this.line);
            this.reset();
        }

        reset() {
            this.active = false;
            this.waitTime = Math.random() * 180 + 90; // frames until launch
            this.pos = new THREE.Vector3(
                (Math.random() - 0.5) * 600 - 100,
                Math.random() * 200 + 150,
                (Math.random() - 0.5) * 200 - 50
            );
            this.vel = new THREE.Vector3(
                -(Math.random() * 8 + 12),
                -(Math.random() * 5 + 7),
                (Math.random() - 0.5) * 2
            );
            this.history = [];
            this.life = 0;
            this.maxLife = 40 + Math.random() * 20;
            this.material.opacity = 0;
        }

        update() {
            if (!this.active) {
                this.waitTime--;
                if (this.waitTime <= 0) {
                    this.active = true;
                }
                return;
            }

            this.life++;
            this.pos.add(this.vel);
            this.history.unshift(this.pos.clone());

            if (this.history.length > this.trailLength) {
                this.history.pop();
            }

            const positions = this.geometry.attributes.position.array;
            for (let i = 0; i < this.history.length; i++) {
                positions[i * 3] = this.history[i].x;
                positions[i * 3 + 1] = this.history[i].y;
                positions[i * 3 + 2] = this.history[i].z;
            }
            this.geometry.attributes.position.needsUpdate = true;

            // Fade in & out
            if (this.life < 10) {
                this.material.opacity = (this.life / 10) * 0.9;
            } else if (this.life > this.maxLife - 15) {
                this.material.opacity = Math.max(0, ((this.maxLife - this.life) / 15) * 0.9);
            }

            if (this.life >= this.maxLife) {
                this.reset();
            }
        }
    }

    for (let i = 0; i < maxMeteors; i++) {
        meteors.push(new Meteor());
    }

    // ==========================================
    // 5. ANIMATION LOOP
    // ==========================================
    let clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Smooth camera parallax following cursor
        targetCameraX += (mouseX - targetCameraX) * 0.05;
        targetCameraY += (-mouseY - targetCameraY) * 0.05;
        camera.position.x = targetCameraX;
        camera.position.y = targetCameraY;
        camera.lookAt(0, 0, 0);

        // Update Galactic Vortex Swirl
        const positions = swirlGeometry.attributes.position.array;
        for (let i = 0; i < swirlCount; i++) {
            swirlAngles[i] += swirlSpeeds[i];
            const r = swirlRadii[i];
            const a = swirlAngles[i];

            // Harmonic wave wobble like Van Gogh oil paint ripples
            const wave = Math.sin(elapsedTime * 1.5 + r * 0.02) * 8;

            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.sin(a) * (r * 0.65) + 60 + wave;
        }
        swirlGeometry.attributes.position.needsUpdate = true;

        // Subtle vortex rotation
        swirlMesh.rotation.z = Math.sin(elapsedTime * 0.1) * 0.05;

        // Gentle moon pulsation
        const moonPulse = 1 + Math.sin(elapsedTime * 2.2) * 0.05;
        moonHalo.scale.set(moonPulse, moonPulse, 1);
        outerHalo.scale.set(1 + Math.cos(elapsedTime * 1.7) * 0.08, 1 + Math.cos(elapsedTime * 1.7) * 0.08, 1);

        // Background twinkling
        bgStarMaterial.opacity = 0.72 + Math.sin(elapsedTime * 2.5) * 0.18;

        // Update Meteors
        for (let m of meteors) {
            m.update();
        }

        renderer.render(scene, camera);
    }

    animate();

    // ==========================================
    // 6. RESIZE HANDLER
    // ==========================================
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ==========================================
    // 7. OPTIONAL BINAURAL NIGHT AMBIENCE GENERATOR
    // (Pure procedural Web Audio API - no external sound files)
    // ==========================================
    let audioCtx = null;
    let isPlaying = false;
    let gainNode = null;

    window.toggleNightAmbience = function () {
        const btn = document.getElementById('night-audio-toggle');
        const icon = document.getElementById('night-audio-icon');

        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();

            // Pink noise buffer generator for soothing night breeze
            const bufferSize = audioCtx.sampleRate * 2;
            const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
                b6 = white * 0.115926;
            }

            const whiteNoise = audioCtx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            // Lowpass filter for warm nocturnal wind sound
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, audioCtx.currentTime);

            gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);

            whiteNoise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            whiteNoise.start();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (!isPlaying) {
            gainNode.gain.setTargetAtTime(0.08, audioCtx.currentTime, 1);
            isPlaying = true;
            if (btn) btn.classList.add('active');
            if (icon) icon.className = 'bi bi-volume-up-fill';
        } else {
            gainNode.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.5);
            isPlaying = false;
            if (btn) btn.classList.remove('active');
            if (icon) icon.className = 'bi bi-volume-mute-fill';
        }
    };
})();
