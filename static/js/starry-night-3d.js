/**
 * Snoozr - Starry Night 3D Experience (Three.js)
 * Inspired by Vincent van Gogh's The Starry Night combined with realistic celestial physics.
 * 
 * Features:
 * - Photorealistic 3D Moon with procedural craters, basaltic Maria, terminator shadows & Earthshine
 * - Realistic Atmospheric Star Scintillation (independent twinkling frequencies & stellar temperatures)
 * - First-Magnitude Navigation Stars with realistic 4-point optical diffraction spikes (Airy disks)
 * - Photorealistic Falling Stars (Meteors & Fireballs) with hypervelocity ionization streaks,
 *   tapered plasma trails, shed spark particles, and terminal bolide bursts
 * - 3D Van Gogh Celestial Swirl (turbulent galactic vortex)
 * - Interactive Mouse Inertia Parallax & Cosmic Particle Turbulence
 */

(function () {
    'use strict';

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
    scene.fog = new THREE.FogExp2(0x050817, 0.0014);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2600);
    camera.position.z = 450;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // --- Mouse & Interaction State ---
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX) * 0.12;
        mouseY = (e.clientY - windowHalfY) * 0.12;
    }, { passive: true });

    // =========================================================================
    // TEXTURE GENERATORS (Stars, Diffraction Spikes, Corona, Meteor Plasma)
    // =========================================================================

    // 1. Soft Spherical Star Sprite
    function createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.18, 'rgba(255, 240, 200, 0.9)');
        grad.addColorStop(0.45, 'rgba(140, 165, 255, 0.45)');
        grad.addColorStop(1, 'rgba(10, 15, 45, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    // 2. Optical Diffraction Spike Texture (Telescope Cross Spikes for Bright Stars)
    function createDiffractionSpikeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const cx = 64;
        const cy = 64;

        // Core Airy disk glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.15, 'rgba(255, 245, 220, 0.9)');
        grad.addColorStop(0.5, 'rgba(112, 214, 255, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        // 4-Point Optical Diffraction Spikes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.4;

        // Horizontal spike with taper
        const hGrad = ctx.createLinearGradient(0, cy, 128, cy);
        hGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        hGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = hGrad;
        ctx.beginPath();
        ctx.moveTo(4, cy);
        ctx.lineTo(124, cy);
        ctx.stroke();

        // Vertical spike with taper
        const vGrad = ctx.createLinearGradient(cx, 0, cx, 128);
        vGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        vGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = vGrad;
        ctx.beginPath();
        ctx.moveTo(cx, 4);
        ctx.lineTo(cx, 124);
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    // 3. Meteor Head Flare Texture
    function createMeteorHeadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(200, 255, 245, 0.95)'); // Incandescent ionized gas
        grad.addColorStop(0.5, 'rgba(255, 209, 102, 0.5)');  // Warm starlight shockwave
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    // 4. Lunar Corona Texture
    function createCoronaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 230, 150, 0.85)');
        gradient.addColorStop(0.25, 'rgba(255, 195, 75, 0.45)');
        gradient.addColorStop(0.55, 'rgba(78, 130, 220, 0.18)');
        gradient.addColorStop(0.85, 'rgba(40, 70, 160, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(canvas);
    }

    // =========================================================================
    // PHOTOREALISTIC PROCEDURAL LUNAR TEXTURE ENGINE (Diffuse + Bump Maps)
    // =========================================================================
    function createRealisticMoonMaps() {
        const width = 1024;
        const height = 512;

        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = width;
        diffCanvas.height = height;
        const diffCtx = diffCanvas.getContext('2d');

        const bumpCanvas = document.createElement('canvas');
        bumpCanvas.width = width;
        bumpCanvas.height = height;
        const bumpCtx = bumpCanvas.getContext('2d');

        diffCtx.fillStyle = '#b6b0a2';
        diffCtx.fillRect(0, 0, width, height);
        bumpCtx.fillStyle = '#808080';
        bumpCtx.fillRect(0, 0, width, height);

        const diffImgData = diffCtx.getImageData(0, 0, width, height);
        const bumpImgData = bumpCtx.getImageData(0, 0, width, height);
        const diffData = diffImgData.data;
        const bumpData = bumpImgData.data;

        for (let i = 0; i < diffData.length; i += 4) {
            const noise = (Math.random() - 0.5) * 22;
            diffData[i] = Math.min(255, Math.max(0, diffData[i] + noise));
            diffData[i + 1] = Math.min(255, Math.max(0, diffData[i + 1] + noise));
            diffData[i + 2] = Math.min(255, Math.max(0, diffData[i + 2] + noise * 0.8));

            const bNoise = (Math.random() - 0.5) * 16;
            bumpData[i] = Math.min(255, Math.max(0, 128 + bNoise));
            bumpData[i + 1] = bumpData[i];
            bumpData[i + 2] = bumpData[i];
        }
        diffCtx.putImageData(diffImgData, 0, 0);
        bumpCtx.putImageData(bumpImgData, 0, 0);

        // Major Lunar Maria
        const maria = [
            { x: 320, y: 190, rx: 110, ry: 90, opacity: 0.72 },
            { x: 470, y: 160, rx: 75, ry: 65, opacity: 0.68 },
            { x: 570, y: 180, rx: 65, ry: 55, opacity: 0.70 },
            { x: 640, y: 220, rx: 70, ry: 60, opacity: 0.69 },
            { x: 740, y: 190, rx: 45, ry: 40, opacity: 0.75 },
            { x: 420, y: 260, rx: 80, ry: 55, opacity: 0.65 },
            { x: 520, y: 250, rx: 50, ry: 45, opacity: 0.66 }
        ];

        maria.forEach(m => {
            const grad = diffCtx.createRadialGradient(m.x, m.y, m.rx * 0.1, m.x, m.y, m.rx);
            grad.addColorStop(0, `rgba(50, 48, 44, ${m.opacity})`);
            grad.addColorStop(0.65, `rgba(65, 62, 58, ${m.opacity * 0.8})`);
            grad.addColorStop(1, 'rgba(182, 176, 162, 0)');
            diffCtx.fillStyle = grad;
            diffCtx.beginPath();
            diffCtx.ellipse(m.x, m.y, m.rx, m.ry, Math.PI / 12, 0, Math.PI * 2);
            diffCtx.fill();

            const bGrad = bumpCtx.createRadialGradient(m.x, m.y, m.rx * 0.1, m.x, m.y, m.rx);
            bGrad.addColorStop(0, 'rgba(80, 80, 80, 0.75)');
            bGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
            bumpCtx.fillStyle = bGrad;
            bumpCtx.beginPath();
            bumpCtx.ellipse(m.x, m.y, m.rx, m.ry, Math.PI / 12, 0, Math.PI * 2);
            bumpCtx.fill();
        });

        function stampCrater(ctxDiff, ctxBump, cx, cy, r, hasRays) {
            if (hasRays) {
                const rayCount = 18;
                ctxDiff.strokeStyle = 'rgba(240, 235, 225, 0.45)';
                ctxDiff.lineWidth = 1.2;
                for (let i = 0; i < rayCount; i++) {
                    const angle = (i / rayCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
                    const rayLen = r * (4 + Math.random() * 8);
                    ctxDiff.beginPath();
                    ctxDiff.moveTo(cx, cy);
                    ctxDiff.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen);
                    ctxDiff.stroke();
                }
            }

            ctxDiff.strokeStyle = 'rgba(235, 230, 218, 0.9)';
            ctxDiff.lineWidth = Math.max(1.5, r * 0.22);
            ctxDiff.beginPath();
            ctxDiff.arc(cx, cy, r, 0, Math.PI * 2);
            ctxDiff.stroke();

            ctxBump.strokeStyle = 'rgba(230, 230, 230, 0.9)';
            ctxBump.lineWidth = Math.max(1.5, r * 0.25);
            ctxBump.beginPath();
            ctxBump.arc(cx, cy, r, 0, Math.PI * 2);
            ctxBump.stroke();

            const floorGrad = ctxDiff.createRadialGradient(cx, cy, 0, cx, cy, r * 0.85);
            floorGrad.addColorStop(0, 'rgba(95, 92, 85, 0.85)');
            floorGrad.addColorStop(1, 'rgba(120, 115, 105, 0.6)');
            ctxDiff.fillStyle = floorGrad;
            ctxDiff.beginPath();
            ctxDiff.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
            ctxDiff.fill();

            const bumpFloorGrad = ctxBump.createRadialGradient(cx, cy, 0, cx, cy, r * 0.85);
            bumpFloorGrad.addColorStop(0, 'rgba(40, 40, 40, 0.9)');
            bumpFloorGrad.addColorStop(1, 'rgba(100, 100, 100, 0.5)');
            ctxBump.fillStyle = bumpFloorGrad;
            ctxBump.beginPath();
            ctxBump.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
            ctxBump.fill();

            if (r > 10) {
                ctxDiff.fillStyle = 'rgba(245, 240, 230, 0.85)';
                ctxDiff.beginPath();
                ctxDiff.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
                ctxDiff.fill();

                ctxBump.fillStyle = 'rgba(220, 220, 220, 0.95)';
                ctxBump.beginPath();
                ctxBump.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
                ctxBump.fill();
            }
        }

        stampCrater(diffCtx, bumpCtx, 490, 360, 28, true);
        stampCrater(diffCtx, bumpCtx, 390, 190, 22, true);
        stampCrater(diffCtx, bumpCtx, 340, 175, 14, true);
        stampCrater(diffCtx, bumpCtx, 460, 105, 20, false);
        stampCrater(diffCtx, bumpCtx, 480, 385, 24, false);
        stampCrater(diffCtx, bumpCtx, 440, 150, 16, false);
        stampCrater(diffCtx, bumpCtx, 290, 140, 13, true);

        for (let i = 0; i < 85; i++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            const rSize = Math.random() * 6 + 2.5;
            stampCrater(diffCtx, bumpCtx, rx, ry, rSize, Math.random() > 0.85);
        }

        const diffTex = new THREE.CanvasTexture(diffCanvas);
        const bumpTex = new THREE.CanvasTexture(bumpCanvas);
        diffTex.wrapS = THREE.RepeatWrapping;
        bumpTex.wrapS = THREE.RepeatWrapping;

        return { diffTex, bumpTex };
    }

    const starTexture = createStarTexture();
    const spikeStarTexture = createDiffractionSpikeTexture();
    const meteorHeadTexture = createMeteorHeadTexture();
    const coronaTexture = createCoronaTexture();
    const { diffTex: moonDiffTex, bumpTex: moonBumpTex } = createRealisticMoonMaps();

    // =========================================================================
    // 1. VAN GOGH SWIRLING COSMIC VORTEX (Points)
    // =========================================================================
    const swirlCount = 4200;
    const swirlGeometry = new THREE.BufferGeometry();
    const swirlPositions = new Float32Array(swirlCount * 3);
    const swirlColors = new Float32Array(swirlCount * 3);
    const swirlSizes = new Float32Array(swirlCount);
    const swirlAngles = new Float32Array(swirlCount);
    const swirlRadii = new Float32Array(swirlCount);
    const swirlSpeeds = new Float32Array(swirlCount);

    const palette = [
        new THREE.Color(0xFFE57F),
        new THREE.Color(0xFFA000),
        new THREE.Color(0x82B1FF),
        new THREE.Color(0x7C4DFF),
        new THREE.Color(0x448AFF),
        new THREE.Color(0xFFFFFF)
    ];

    for (let i = 0; i < swirlCount; i++) {
        const armIndex = i % 3;
        const armOffset = (armIndex * 2 * Math.PI) / 3;
        const radius = Math.pow(Math.random(), 1.5) * 550 + 20;
        const angle = Math.log(radius * 0.1) * 3.5 + armOffset + (Math.random() - 0.5) * 0.8;
        const zSpread = (Math.random() - 0.5) * 120 + Math.sin(radius * 0.03) * 40;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * (radius * 0.65) + 60;
        const z = zSpread - 100;

        swirlPositions[i * 3] = x;
        swirlPositions[i * 3 + 1] = y;
        swirlPositions[i * 3 + 2] = z;

        swirlAngles[i] = angle;
        swirlRadii[i] = radius;
        swirlSpeeds[i] = (0.0008 + (600 - radius) * 0.000003) * (i % 2 === 0 ? 1 : 1.15);

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

    // =========================================================================
    // 2. REALISTIC STARFIELD WITH INDEPENDENT ATMOSPHERIC SCINTILLATION
    // =========================================================================
    // Realistic multi-tier starfield:
    // A. 3,000 Field Stars with independent twinkling frequencies & color temperatures
    // B. 40 First-Magnitude Bright Navigation Stars with 4-point optical diffraction spikes
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starBaseColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starBaseSizes = new Float32Array(starCount);
    const starTwinkleFrequencies = new Float32Array(starCount);
    const starTwinklePhases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 1500;
        const z = -Math.random() * 1100 - 80;

        starPositions[i * 3] = x;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = z;

        // Realistic stellar classification temperatures (O/B/A blue-white, F/G yellow, K/M orange-red)
        const temp = Math.random();
        let starColor;
        if (temp > 0.92) starColor = new THREE.Color(0xFFE0B2);      // K/M Warm Amber Giant
        else if (temp > 0.65) starColor = new THREE.Color(0xFFFFFF); // A-class Diamond White (Sirius/Vega)
        else if (temp > 0.3) starColor = new THREE.Color(0xD0E8FF);  // B-class Electric Blue
        else if (temp > 0.08) starColor = new THREE.Color(0xFFF1C5); // G-class Golden (Sol)
        else starColor = new THREE.Color(0x90CAF9);                  // Deep Cyan Star

        starColors[i * 3] = starColor.r;
        starColors[i * 3 + 1] = starColor.g;
        starColors[i * 3 + 2] = starColor.b;

        starBaseColors[i * 3] = starColor.r;
        starBaseColors[i * 3 + 1] = starColor.g;
        starBaseColors[i * 3 + 2] = starColor.b;

        // Visual magnitude distribution: mostly faint stars, few prominent stars
        const magRand = Math.random();
        let size = (magRand > 0.96) ? (Math.random() * 3.5 + 3.0) : (Math.random() * 2.2 + 0.8);
        starBaseSizes[i] = size;
        starSizes[i] = size;

        // Atmospheric turbulence twinkle parameters (independent per star)
        starTwinkleFrequencies[i] = Math.random() * 4.5 + 1.2; // 1.2 - 5.7 Hz
        starTwinklePhases[i] = Math.random() * Math.PI * 2;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.PointsMaterial({
        size: 3.2,
        vertexColors: true,
        map: starTexture,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const starMesh = new THREE.Points(starGeo, starMaterial);
    scene.add(starMesh);

    // --- First-Magnitude Prominent Stars (Airy Disk + 4-Point Optical Diffraction Spikes) ---
    const brightStarCount = 38;
    const brightStarGroup = new THREE.Group();
    const brightStarsData = [];

    for (let i = 0; i < brightStarCount; i++) {
        const spriteMat = new THREE.SpriteMaterial({
            map: spikeStarTexture,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMat);

        const x = (Math.random() - 0.5) * 1600;
        const y = (Math.random() - 0.5) * 1200;
        const z = -Math.random() * 500 - 50;
        sprite.position.set(x, y, z);

        const baseScale = Math.random() * 14 + 16;
        sprite.scale.set(baseScale, baseScale, 1);

        brightStarGroup.add(sprite);
        brightStarsData.push({
            sprite,
            baseScale,
            twinkleFreq: Math.random() * 3.2 + 1.5,
            phase: Math.random() * Math.PI * 2
        });
    }
    scene.add(brightStarGroup);

    // =========================================================================
    // 3. PHOTOREALISTIC 3D LUNAR SPHERE & CELESTIAL LIGHTING
    // =========================================================================
    const moonGroup = new THREE.Group();
    moonGroup.position.set(245, 125, -20);
    moonGroup.rotation.z = 0.116; // 6.68 deg axial tilt

    const ambientLight = new THREE.AmbientLight(0x0e1730, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 3.4);
    sunLight.position.set(380, 160, 200);
    sunLight.target = moonGroup;
    scene.add(sunLight);

    const earthshineLight = new THREE.DirectionalLight(0x3e659c, 0.45);
    earthshineLight.position.set(-200, -80, -100);
    earthshineLight.target = moonGroup;
    scene.add(earthshineLight);

    const moonRadius = 44;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
        map: moonDiffTex,
        bumpMap: moonBumpTex,
        bumpScale: 2.2,
        roughness: 0.88,
        metalness: 0.04
    });

    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    const innerCoronaGeo = new THREE.PlaneGeometry(160, 160);
    const innerCoronaMat = new THREE.MeshBasicMaterial({
        map: coronaTexture,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
    innerCorona.position.set(10, 0, -2);
    moonGroup.add(innerCorona);

    const outerCoronaGeo = new THREE.PlaneGeometry(280, 280);
    const outerCoronaMat = new THREE.MeshBasicMaterial({
        map: coronaTexture,
        color: 0xFFA000,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const outerCorona = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
    outerCorona.position.set(10, 0, -4);
    moonGroup.add(outerCorona);

    scene.add(moonGroup);

    // =========================================================================
    // 4. PHOTOREALISTIC FALLING STARS (METEORS & BOLIDE FIREBALLS)
    // Features: Hypervelocity ionization streak, incandescent plasma head,
    // tapering cooling tail, trailing spark particles, and terminal ablation burst!
    // =========================================================================
    const meteorPool = [];
    const maxActiveMeteors = 3;

    class RealisticMeteor {
        constructor() {
            this.group = new THREE.Group();

            // 1. Incandescent Head Sprite (blinding white-cyan plasma core)
            const headMat = new THREE.SpriteMaterial({
                map: meteorHeadTexture,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            this.head = new THREE.Sprite(headMat);
            this.head.scale.set(14, 14, 1);
            this.group.add(this.head);

            // 2. Tapered Ionization Plasma Ribbon (Segmented line with gradient opacity)
            this.trailSegments = 28;
            this.trailGeo = new THREE.BufferGeometry();
            const trailPositions = new Float32Array(this.trailSegments * 3);
            const trailColors = new Float32Array(this.trailSegments * 3);

            this.trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            this.trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

            this.trailMat = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                linewidth: 2.5
            });

            this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
            this.group.add(this.trailLine);

            // 3. Terminal Bolide Burst Sprite (Explosion flash at peak ablation)
            const burstMat = new THREE.SpriteMaterial({
                map: meteorHeadTexture,
                color: 0xFFE082,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            this.burst = new THREE.Sprite(burstMat);
            this.burst.scale.set(35, 35, 1);
            this.group.add(this.burst);

            // 4. Shedding Spark Ejecta
            this.sparkCount = 8;
            this.sparks = [];
            for (let i = 0; i < this.sparkCount; i++) {
                const sMat = new THREE.SpriteMaterial({
                    map: starTexture,
                    color: 0xFFA000,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const s = new THREE.Sprite(sMat);
                s.scale.set(3, 3, 1);
                this.group.add(s);
                this.sparks.push({ sprite: s, offset: new THREE.Vector3(), life: 0 });
            }

            scene.add(this.group);
            this.reset();
        }

        reset() {
            this.active = false;
            // Realistic interval: occasional celestial event (1.5 - 4.5 seconds between shooting stars)
            this.waitTime = Math.random() * 160 + 80;

            // Celestial Radiant origin (descending from the upper starry sky)
            const startX = (Math.random() - 0.4) * 700 + 100;
            const startY = Math.random() * 180 + 160;
            const startZ = (Math.random() - 0.5) * 200 - 30;
            this.pos = new THREE.Vector3(startX, startY, startZ);

            // Realistic hypervelocity entry vector (swift atmospheric speed: 18 - 28 units/frame)
            const speed = Math.random() * 10 + 18;
            const angle = -(Math.PI * 0.22 + (Math.random() - 0.5) * 0.2); // ~35-45 degree entry angle
            this.vel = new THREE.Vector3(
                Math.cos(angle) * speed * -1.1,
                Math.sin(angle) * speed,
                (Math.random() - 0.5) * 2.5
            );

            this.history = [];
            this.life = 0;
            // Realistic duration: quick flash lasting 0.4 - 0.8 seconds (24 - 42 frames at 60fps)
            this.maxLife = Math.floor(Math.random() * 18 + 24);
            this.isBolide = Math.random() > 0.72; // 28% are brilliant fireballs with terminal burst

            this.head.material.opacity = 0;
            this.trailMat.opacity = 0;
            this.burst.material.opacity = 0;

            for (let sp of this.sparks) {
                sp.sprite.material.opacity = 0;
                sp.life = 0;
            }
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

            if (this.history.length > this.trailSegments) {
                this.history.pop();
            }

            // Move Head Sprite
            this.head.position.copy(this.pos);

            // Atmospheric Aerodynamic Heating Curve:
            // Rapid incandescent ignition -> peak ionization -> gradual cooldown / terminal burst
            let intensity = 0;
            const progress = this.life / this.maxLife;

            if (progress < 0.2) {
                intensity = progress / 0.2; // Rapid ignition
            } else if (progress < 0.75) {
                intensity = 1.0 + (this.isBolide ? Math.sin(progress * 15) * 0.4 : 0); // Peak ionization
            } else {
                intensity = Math.max(0, (1 - progress) / 0.25); // Ablation burn-out
            }

            this.head.material.opacity = Math.min(1.0, intensity * 0.98);
            const headSize = (this.isBolide ? 18 : 12) * (0.8 + intensity * 0.4);
            this.head.scale.set(headSize, headSize, 1);

            // Update Ionization Plasma Trail Buffer
            const positions = this.trailGeo.attributes.position.array;
            const colors = this.trailGeo.attributes.color.array;

            for (let i = 0; i < this.trailSegments; i++) {
                const pt = this.history[i] || this.pos;
                positions[i * 3] = pt.x;
                positions[i * 3 + 1] = pt.y;
                positions[i * 3 + 2] = pt.z;

                // Color cooling along plasma train:
                // Head: White-cyan (magnesium/nitrogen) -> Gold -> Amber -> Fiery red -> Void
                const tProg = i / this.trailSegments;
                const alpha = Math.max(0, (1 - tProg) * intensity);

                if (tProg < 0.15) {
                    colors[i * 3] = 1.0 * alpha;
                    colors[i * 3 + 1] = 1.0 * alpha;
                    colors[i * 3 + 2] = 0.95 * alpha;
                } else if (tProg < 0.45) {
                    colors[i * 3] = 1.0 * alpha;
                    colors[i * 3 + 1] = 0.82 * alpha;
                    colors[i * 3 + 2] = 0.4 * alpha;
                } else {
                    colors[i * 3] = 0.9 * alpha;
                    colors[i * 3 + 1] = 0.4 * alpha;
                    colors[i * 3 + 2] = 0.15 * alpha;
                }
            }

            this.trailGeo.attributes.position.needsUpdate = true;
            this.trailGeo.attributes.color.needsUpdate = true;
            this.trailMat.opacity = Math.min(1.0, intensity * 0.95);

            // Shedding Sparks & Smoke
            for (let i = 0; i < this.sparkCount; i++) {
                const sp = this.sparks[i];
                if (this.life > 6 && Math.random() > 0.4) {
                    if (sp.life <= 0) {
                        sp.life = 12;
                        sp.sprite.position.copy(this.pos);
                        sp.offset.set(
                            (Math.random() - 0.5) * 4 - this.vel.x * 0.15,
                            (Math.random() - 0.5) * 4 - this.vel.y * 0.15,
                            (Math.random() - 0.5) * 3
                        );
                    }
                }
                if (sp.life > 0) {
                    sp.life--;
                    sp.sprite.position.add(sp.offset);
                    sp.sprite.material.opacity = (sp.life / 12) * 0.65;
                } else {
                    sp.sprite.material.opacity = 0;
                }
            }

            // Terminal Bolide Burst (Explosion flash at peak vaporization)
            if (this.isBolide && progress > 0.7 && progress < 0.88) {
                this.burst.position.copy(this.pos);
                const burstProgress = (progress - 0.7) / 0.18;
                this.burst.material.opacity = Math.sin(burstProgress * Math.PI) * 0.85;
                const bScale = 25 + Math.sin(burstProgress * Math.PI) * 20;
                this.burst.scale.set(bScale, bScale, 1);
            } else {
                this.burst.material.opacity = 0;
            }

            // Expired -> Reset with random delay
            if (this.life >= this.maxLife) {
                this.reset();
            }
        }
    }

    for (let i = 0; i < maxActiveMeteors; i++) {
        meteorPool.push(new RealisticMeteor());
    }

    // =========================================================================
    // 5. ANIMATION LOOP
    // =========================================================================
    let clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // 3D Parallax camera with smooth inertia
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

            const wave = Math.sin(elapsedTime * 1.5 + r * 0.02) * 8;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.sin(a) * (r * 0.65) + 60 + wave;
        }
        swirlGeometry.attributes.position.needsUpdate = true;
        swirlMesh.rotation.z = Math.sin(elapsedTime * 0.1) * 0.05;

        // REALISTIC ATMOSPHERIC STELLAR SCINTILLATION
        // Update per-star independent scintillation brightness and color shift
        const sColors = starGeo.attributes.color.array;
        for (let i = 0; i < starCount; i += 2) { // optimize: alternate frames
            const freq = starTwinkleFrequencies[i];
            const phase = starTwinklePhases[i];
            // Multi-harmonic atmospheric seeing oscillation
            const twinkle = 0.5 + 0.5 * Math.sin(elapsedTime * freq + phase);
            const microJitter = 0.85 + 0.15 * Math.sin(elapsedTime * (freq * 2.3) + phase);
            const factor = twinkle * microJitter;

            const br = starBaseColors[i * 3];
            const bg = starBaseColors[i * 3 + 1];
            const bb = starBaseColors[i * 3 + 2];

            sColors[i * 3] = br * (0.4 + factor * 0.7);
            sColors[i * 3 + 1] = bg * (0.4 + factor * 0.7);
            sColors[i * 3 + 2] = bb * (0.4 + factor * 0.7);
        }
        starGeo.attributes.color.needsUpdate = true;

        // Animate First-Magnitude Navigation Stars (Airy Disk diffraction pulses)
        for (let bData of brightStarsData) {
            const bTwinkle = 0.7 + 0.3 * Math.sin(elapsedTime * bData.twinkleFreq + bData.phase);
            const scale = bData.baseScale * bTwinkle;
            bData.sprite.scale.set(scale, scale, 1);
            bData.sprite.material.opacity = 0.65 + bTwinkle * 0.35;
        }

        // Slow Lunar Axial Rotation
        moonMesh.rotation.y = elapsedTime * 0.025;

        // Atmospheric corona pulsation
        const moonPulse = 1 + Math.sin(elapsedTime * 2.2) * 0.04;
        innerCorona.scale.set(moonPulse, moonPulse, 1);
        outerCorona.scale.set(1 + Math.cos(elapsedTime * 1.7) * 0.06, 1 + Math.cos(elapsedTime * 1.7) * 0.06, 1);

        // Update Realistic Falling Stars
        for (let m of meteorPool) {
            m.update();
        }

        renderer.render(scene, camera);
    }

    animate();

    // =========================================================================
    // 6. RESIZE HANDLER
    // =========================================================================
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // =========================================================================
    // 7. BINAURAL NIGHT AMBIENCE GENERATOR
    // =========================================================================
    let audioCtx = null;
    let isPlaying = false;
    let gainNode = null;

    window.toggleNightAmbience = function () {
        const btn = document.getElementById('night-audio-toggle');
        const icon = document.getElementById('night-audio-icon');

        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();

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
