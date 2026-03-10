import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";
import cubeInfo from "../static/assets/json/cubeInfo.json";
import Cube from "cubejs";

class RubiksCubeApp {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.loadingEl = document.getElementById("loading");
    this.solvedEl = document.getElementById("solved-message");

    this._initScene();
    this._initLighting();
    this._initAudio();
    this._loadAssets();
    this._bindResize();
    this._tick();
  }

  // ─── Scene / Camera / Renderer ───────────────────────────────────────────

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.set(10, 6, 10);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Cube state
    this.rubikGroup = new THREE.Group();
    this.rubikCubes = [];
    this.childrensToRotate = [];
    this.sideToRotate = null;
    this.layerToRotate = null;
    this.movesCompletedStack = [];
    this.currentMove = null;
    this.movementsStack = [];
    this.pivot = new THREE.Object3D();
    this.objectRaycasted = null;
    this.firstClickPosition = null;
    this.firstClickNormal = null;
    this.draggingg = false;
    this.objectClicked = null;
    this.isMoving = false;
    this.allCubies = [];
    this.hasBeenSolved = false;
    this.duration = 0;
    this.isActive = false;
    this.isSolving = false;
    this.solveTotal = 0;
    this.solveDone = 0;
  }

  _initLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 5, 5);
    this.scene.add(dir);
  }

  // ─── Audio ───────────────────────────────────────────────────────────────

  _initAudio() {
    this.sounds = {};
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);
    const loader = new THREE.AudioLoader();
    ["rubik_1", "rubik_2", "rubik_3", "confetti", "partyblower"].forEach((name) => {
      loader.load(`/assets/sounds/${name}.mp3`, (buffer) => {
        this.sounds[name] = buffer;
      });
    });
  }

  _playSound(name, volume = 0.5) {
    if (!this.sounds[name]) return;
    const sound = new THREE.Audio(this.audioListener);
    sound.setBuffer(this.sounds[name]);
    sound.setVolume(volume);
    sound.play();
  }

  // ─── Asset Loading ────────────────────────────────────────────────────────

  _loadAssets() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("draco/");

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const cubeTextureLoader = new THREE.CubeTextureLoader();

    let gltfDone = false, texDone = false;
    let gltfData, cubeTexture;

    const tryInit = () => {
      if (!gltfDone || !texDone) return;
      this._setupCube(gltfData.scene, cubeTexture);
      this.loadingEl.style.display = "none";
      this.isActive = true;
      this.duration = 0.5;
      this._bindInput();
      // Prime solver tables after cube is visible, non-blocking
      if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("initializing");
      setTimeout(() => {
        Cube.initSolver();
        this._solverReady = true;
        if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("ready");
      }, 500);
    };

    gltfLoader.load("/assets/models/Rubik.glb", (gltf) => {
      gltfData = gltf;
      gltfDone = true;
      tryInit();
    });

    cubeTextureLoader.load(
      [
        "/assets/environmentMaps/nx.jpg",
        "/assets/environmentMaps/ny.jpg",
        "/assets/environmentMaps/nz.jpg",
        "/assets/environmentMaps/px.jpg",
        "/assets/environmentMaps/py.jpg",
        "/assets/environmentMaps/pz.jpg",
      ],
      (tex) => {
        cubeTexture = tex;
        texDone = true;
        tryInit();
      }
    );
  }

  // ─── Cube Setup ───────────────────────────────────────────────────────────

  _setupCube(object, cubeTexture) {
    object.traverse((child) => {
      if (child.isMesh) child.material.envMap = cubeTexture;
    });

    for (let i = object.children.length - 1; i >= 0; i--) {
      const child = object.children[i];
      Object.assign(child, cubeInfo[i]);
      child.isRubik = true;
      child.position.set(0, 0, 0);
      this.rubikCubes.push(child);
      this.rubikGroup.add(child);
    }

    this.rubikGroup.name = "rubikGroup";
    this.scene.add(this.rubikGroup);

    // Small instant scramble so it's not solved from the start
    this.movementsStack.push(
      { layer: "col",   number: 1, orientation: 1  },
      { layer: "row",   number: 3, orientation: -1 },
      { layer: "depth", number: 3, orientation: 1  },
      { layer: "col",   number: 1, orientation: -1 }
    );
    this._startNextMove();
  }

  // ─── Commutator test: R U R' U' × 6 should return to solved ─────────────
  _testCommutator() {
    if (this.isMoving || this.movementsStack.length) {
      console.warn("Commutator test: cube is busy, try again.");
      return;
    }
    // Capture baseline
    const baseline = this.getFaceletString();
    console.log("Commutator test started. Baseline facelet:", baseline);

    const seq = [
      { layer: "col", number: 3, orientation: 1 }, // R
      { layer: "row", number: 1, orientation: 0 }, // U
      { layer: "col", number: 3, orientation: 0 }, // R'
      { layer: "row", number: 1, orientation: 1 }, // U'
    ];
    // × 6 = 24 moves
    for (let i = 0; i < 6; i++) seq.forEach(m => this.movementsStack.push({ ...m }));

    // Patch _startNextMove to check on last completion
    const totalMoves = 24;
    let testDone = false;
    const origMoveComplete = this._moveComplete.bind(this);
    const checkCount = () => {
      if (testDone) return;
      if (this.movesCompletedStack.length - this._commutatorTestOffset >= totalMoves) {
        testDone = true;
        const after = this.getFaceletString();
        console.group("🔬 DIAGNOSTIC: Commutator Test (R U R' U') × 6");
        console.log("Before:", baseline);
        console.log("After: ", after);
        console.log("Test 3:", after === baseline ? "✅ PASS — orientation mapping is CORRECT" : "❌ FAIL — orientation mapping is WRONG");
        console.groupEnd();
        window._aiSolveStatus?.("ready");
      }
    };
    this._commutatorTestOffset = this.movesCompletedStack.length;
    const origMC = this._moveComplete;
    this._moveComplete = function() {
      origMC.call(this);
      checkCount();
      if (testDone) this._moveComplete = origMC;
    };

    window._aiSolveStatus?.("solving", 0, totalMoves);
    this._startNextMove();
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _bindInput() {
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  _onPointerMove = (event) => {
    this.pointer.x =  (event.clientX / innerWidth)  * 2 - 1;
    this.pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  };

  _onPointerDown = () => {
    if (this.objectRaycasted && this.objectRaycasted.object.parent.isRubik && !this.isMoving) {
      const normal = this.objectRaycasted.face.normal;
      this.firstClickNormal = this._getRealNormal(
        normal.transformDirection(this.objectRaycasted.object.parent.matrixWorld)
      );
      this.objectClicked = this.objectRaycasted.object.parent;
      this.draggingg = true;
      this.firstClickPosition = new THREE.Vector2(this.pointer.x, this.pointer.y);
      this.controls.enabled = false; // let cube interaction take over
    }
  };

  _onPointerUp = () => {
    this.controls.enabled = true;
    if (!this.draggingg) return;

    const current = new THREE.Vector2(this.pointer.x, this.pointer.y);
    const delta = new THREE.Vector2(
      current.x - this.firstClickPosition.x,
      current.y - this.firstClickPosition.y
    );

    if (delta.x === 0 && delta.y === 0) { this.draggingg = false; return; }

    const vertical  = Math.abs(delta.x) <= Math.abs(delta.y);
    const posX      = delta.x >= 0;
    const posY      = delta.y >= 0;
    const { layer: normalLayer, sign } = this.firstClickNormal;

    if (vertical) {
      if (normalLayer === "x") {
        this.movementsStack.push({ layer: "depth", number: this.objectClicked.depth,
          orientation: sign === 0 ? (posY ? 0 : 1) : (posY ? 1 : 0) });
      } else if (normalLayer === "y") {
        this.movementsStack.push({ layer: "col", number: this.objectClicked.col,
          orientation: sign === 0 ? (posY ? 1 : 0) : (posY ? 0 : 1) });
      } else if (normalLayer === "z") {
        this.movementsStack.push({ layer: "col", number: this.objectClicked.col,
          orientation: sign === 0 ? (posY ? 1 : 0) : (posY ? 0 : 1) });
      }
    } else {
      if (normalLayer === "x") {
        this.movementsStack.push({ layer: "row", number: this.objectClicked.row,
          orientation: sign === 0 ? (posX ? 1 : 0) : (posX ? 1 : 0) });
      } else if (normalLayer === "y") {
        this.movementsStack.push({ layer: "depth", number: this.objectClicked.depth,
          orientation: sign === 0 ? (posX ? 1 : 0) : (posX ? 0 : 1) });
      } else if (normalLayer === "z") {
        this.movementsStack.push({ layer: "row", number: this.objectClicked.row,
          orientation: sign === 0 ? (posX ? 1 : 0) : (posX ? 1 : 0) });
      }
    }

    this._startNextMove();
    this.draggingg = false;
    this.objectClicked = null;
  };

  // ─── Cube Logic (adapted from RubiksCube.js) ──────────────────────────────

  _getRealNormal(normal) {
    if (Math.abs(normal.x) > Math.abs(normal.y)) {
      return Math.abs(normal.z) > Math.abs(normal.x)
        ? { layer: "z", sign: normal.z >= 0 ? 1 : 0 }
        : { layer: "x", sign: normal.x >= 0 ? 1 : 0 };
    } else {
      return Math.abs(normal.z) > Math.abs(normal.y)
        ? { layer: "z", sign: normal.z >= 0 ? 1 : 0 }
        : { layer: "y", sign: normal.y >= 0 ? 1 : 0 };
    }
  }

  _rotateCube(layer, number, orientation) {
    this.childrensToRotate = [];
    this.rubikCubes.forEach((cubie) => {
      if (layer === "row"   && cubie.row   === number) this.childrensToRotate.push(cubie);
      if (layer === "col"   && cubie.col   === number) this.childrensToRotate.push(cubie);
      if (layer === "depth" && cubie.depth === number) this.childrensToRotate.push(cubie);
    });
    this.childrensToRotate.forEach(() => {
      this.sideToRotate  = orientation ? 1 : -1;
      this.layerToRotate = layer === "row" ? "y" : layer === "col" ? "x" : "z";
    });
  }

  _startNextMove() {
    if (!this.movementsStack.length) return;
    if (this.isMoving) return;

    if (this.duration !== 0) {
      this._playSound("rubik_" + (Math.floor(Math.random() * 3) + 1), 0.5);
    }

    this.currentMove = this.movementsStack.shift();
    this._rotateCube(this.currentMove.layer, this.currentMove.number, this.currentMove.orientation);

    this.pivot.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld();
    this.pivot.name = "rubikPivot";
    this.scene.add(this.pivot);

    this.childrensToRotate.forEach((cube) => this.pivot.attach(cube));
    this.isMoving = true;

    const target = this.pivot.rotation[this.layerToRotate] + (this.sideToRotate * Math.PI) / 2;
    gsap.to(this.pivot.rotation, {
      [this.layerToRotate]: target,
      duration: this.duration,
      ease: "power1.inOut",
      onComplete: () => this._moveComplete(),
    });
  }

  // ─── AI Solver ────────────────────────────────────────────────────────────

  // Build a lookup: [row][col][depth] → cubie
  _getCubieMap() {
    const map = {};
    this.rubikCubes.forEach((c) => {
      map[`${c.row}_${c.col}_${c.depth}`] = c;
    });
    return map;
  }

  // Find current face-letter for a color by reading center cubies
  _buildColorToFaceMap() {
    const map = {};
    const m = this._getCubieMap();
    // Centers: row=2,col=2 for U/D; col=2,depth=2 for L/R; row=2,depth=2 for F/B
    map[m["1_2_2"]?.colors["U"]] = "U"; // Top center
    map[m["3_2_2"]?.colors["D"]] = "D"; // Bottom center
    map[m["2_2_1"]?.colors["F"]] = "F"; // Front center
    map[m["2_2_3"]?.colors["B"]] = "B"; // Back center
    map[m["2_1_2"]?.colors["L"]] = "L"; // Left center
    map[m["2_3_2"]?.colors["R"]] = "R"; // Right center
    return map;
  }

  getFaceletString() {
    const map = this._getCubieMap();
    const colorToFace = this._buildColorToFaceMap();
    const get = (row, col, depth, face) => {
      const c = map[`${row}_${col}_${depth}`];
      return colorToFace[c?.colors[face]] ?? "U";
    };

    let s = "";
    // U: depth 3→1, col 1→3, row=1
    for (let d = 3; d >= 1; d--) for (let c = 1; c <= 3; c++) s += get(1, c, d, "U");
    // R: row 1→3, depth 1→3, col=3
    for (let r = 1; r <= 3; r++) for (let d = 1; d <= 3; d++) s += get(r, 3, d, "R");
    // F: row 1→3, col 1→3, depth=1
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) s += get(r, c, 1, "F");
    // D: depth 1→3, col 1→3, row=3
    for (let d = 1; d <= 3; d++) for (let c = 1; c <= 3; c++) s += get(3, c, d, "D");
    // L: row 1→3, depth 3→1, col=1
    for (let r = 1; r <= 3; r++) for (let d = 3; d >= 1; d--) s += get(r, 1, d, "L");
    // B: row 1→3, col 3→1, depth=3
    for (let r = 1; r <= 3; r++) for (let c = 3; c >= 1; c--) s += get(r, c, 3, "B");

    return s;
  }

  parseSolutionToMoves(solutionStr) {
    if (!solutionStr || !solutionStr.trim()) return [];
    // orientation uses truthy check in engine: 1 → sideToRotate=+1, 0 → sideToRotate=-1
    // (-1 is also truthy, so ONLY use 1 and 0 here)
    const moveMap = {
      // Y-Axis (Row) -> Positive side is Top (U)
      "U":  { layer: "row",   number: 1, orientation: 0 },
      "U'": { layer: "row",   number: 1, orientation: 1 },
      "D":  { layer: "row",   number: 3, orientation: 1 },
      "D'": { layer: "row",   number: 3, orientation: 0 },
      // X-Axis (Col) -> Positive side is Right (R)
      "R":  { layer: "col",   number: 3, orientation: 0 },
      "R'": { layer: "col",   number: 3, orientation: 1 },
      "L":  { layer: "col",   number: 1, orientation: 1 },
      "L'": { layer: "col",   number: 1, orientation: 0 },
      // Z-Axis (Depth) -> Positive side is Front (F)
      "F":  { layer: "depth", number: 1, orientation: 0 },
      "F'": { layer: "depth", number: 1, orientation: 1 },
      "B":  { layer: "depth", number: 3, orientation: 1 },
      "B'": { layer: "depth", number: 3, orientation: 0 },
    };
    const moves = [];
    solutionStr.trim().split(/\s+/).forEach((token) => {
      const double = token.endsWith("2");
      const key = token.replace("2", "");
      const base = moveMap[key];
      if (!base) return;
      moves.push({ ...base });
      if (double) moves.push({ ...base });
    });
    return moves;
  }

  solveWithAI() {
    if (this.isSolving || this.isMoving || !this._solverReady) return;
    if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("analyzing");

    // Defer so UI updates before heavy computation
    setTimeout(() => {
      try {
        const facelet = this.getFaceletString();
        const cube = Cube.fromString(facelet);
        const solutionStr = cube.solve();
        const moves = this.parseSolutionToMoves(solutionStr);

        if (moves.length === 0) {
          if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("already-solved");
          return;
        }

        this.isSolving = true;
        this.solveTotal = moves.length;
        this.solveDone = 0;
        this.hasBeenSolved = false; // allow re-trigger solved celebration

        if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("solving", 0, moves.length);

        const prevDuration = this.duration;
        this.duration = 0.12;
        // Disable user drag during solve
        window.removeEventListener("pointerdown", this._onPointerDown);
        window.removeEventListener("pointerup", this._onPointerUp);

        moves.forEach((m) => this.movementsStack.push(m));

        // Patch _moveComplete to track progress
        this._solveRestoreOnDone = () => {
          this.duration = prevDuration;
          this.isSolving = false;
          window.addEventListener("pointerdown", this._onPointerDown);
          window.addEventListener("pointerup", this._onPointerUp);
          this._solveRestoreOnDone = null;
          if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("done");
        };

        this._startNextMove();
      } catch (e) {
        console.error("AI Solve error:", e);
        if (typeof window._aiSolveStatus === "function") window._aiSolveStatus("error");
      }
    }, 50);
  }

  _moveComplete() {
    this.isMoving = false;
    this.pivot.updateMatrixWorld();

    const currentOri = this.sideToRotate === -1 ? 0 : 1;
    const currLay =
      this.layerToRotate === "x" ? "col" :
      this.layerToRotate === "y" ? "row" :
      this.layerToRotate === "z" ? "depth" : undefined;

    // Pass 1: detach all cubies from pivot to scene (preserves world transform)
    this.childrensToRotate.forEach((cube) => {
      this.scene.attach(cube);
    });

    // Pass 2: update logical state, re-add to group, snap rotation via quaternion
    const halfPi = Math.PI / 2;
    this.childrensToRotate.forEach((cube) => {
      this._updateValuesAfterRotation(currLay, cube, currentOri);
      this.rubikGroup.add(cube);

      // Snap to nearest 90° via quaternion — avoids Gimbal lock and float drift
      const rx = Math.round(cube.rotation.x / halfPi) * halfPi;
      const ry = Math.round(cube.rotation.y / halfPi) * halfPi;
      const rz = Math.round(cube.rotation.z / halfPi) * halfPi;
      cube.quaternion.setFromEuler(new THREE.Euler(rx, ry, rz, "XYZ"));
      cube.updateMatrix();
    });

    // Reset pivot for next use
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrix();

    this.movesCompletedStack.push(this.currentMove);

    // AI solve progress tracking
    if (this.isSolving) {
      this.solveDone++;
      if (typeof window._aiSolveStatus === "function") {
        window._aiSolveStatus("solving", this.solveDone, this.solveTotal);
      }
      if (this.solveDone >= this.solveTotal && this._solveRestoreOnDone) {
        this._solveRestoreOnDone();
      }
    }

    this._startNextMove();

    this.allCubies.length = 0;
    this._collectCubies(this.scene);
    this.allCubies.sort((a, b) => a.name.localeCompare(b.name));
    this._checkSolved(this.allCubies);
  }

  _rotateValues(v1, v2) {
    const newV2 = v1 === 1 ? 3 : v1 === 3 ? 1 : v1;
    return { newValue1: v2, newValue2: newV2 };
  }

  _updateColors(colors, order) {
    const orig = { ...colors };
    order.forEach((c, i) => { colors[order[(i + 1) % order.length]] = orig[c]; });
    return colors;
  }

  _updateValuesAfterRotation(layer, child, orientation) {
    let r;
    switch (layer) {
      case "row":
        if (orientation === 1) {
          r = this._rotateValues(child.depth, child.col);
          child.depth = r.newValue1; child.col = r.newValue2;
          child.colors = this._updateColors(child.colors, ["F","R","B","L"]);
        } else {
          r = this._rotateValues(child.col, child.depth);
          child.col = r.newValue1; child.depth = r.newValue2;
          child.colors = this._updateColors(child.colors, ["F","L","B","R"]);
        }
        break;
      case "col":
        if (orientation === 1) {
          r = this._rotateValues(child.depth, child.row);
          child.depth = r.newValue1; child.row = r.newValue2;
          child.colors = this._updateColors(child.colors, ["F","D","B","U"]);
        } else {
          r = this._rotateValues(child.row, child.depth);
          child.row = r.newValue1; child.depth = r.newValue2;
          child.colors = this._updateColors(child.colors, ["F","U","B","D"]);
        }
        break;
      case "depth":
        if (orientation === 1) {
          r = this._rotateValues(child.col, child.row);
          child.col = r.newValue1; child.row = r.newValue2;
          child.colors = this._updateColors(child.colors, ["R","U","L","D"]);
        } else {
          r = this._rotateValues(child.row, child.col);
          child.row = r.newValue1; child.col = r.newValue2;
          child.colors = this._updateColors(child.colors, ["R","D","L","U"]);
        }
        break;
    }
    child.updateWorldMatrix();
  }

  _collectCubies(object) {
    if (Object.prototype.hasOwnProperty.call(object, "colors")) this.allCubies.push(object);
    if (object.children) object.children.forEach((c) => this._collectCubies(c));
  }

  _checkSolved(cubies) {
    let solved = true;
    const faces = { U: null, D: null, L: null, R: null, F: null, B: null };

    cubies.forEach((cubie) => {
      [
        [cubie.depth === 1, "F"], [cubie.depth === 3, "B"],
        [cubie.row   === 1, "U"], [cubie.row   === 3, "D"],
        [cubie.col   === 1, "L"], [cubie.col   === 3, "R"],
      ].forEach(([cond, face]) => {
        if (!cond) return;
        if (faces[face] === null) faces[face] = cubie.colors[face];
        else if (faces[face] !== cubie.colors[face]) solved = false;
      });
    });

    if (solved && !this.hasBeenSolved) {
      this.hasBeenSolved = true;
      this._onSolved();
    }
  }

  _onSolved() {
    this._playSound("confetti", 0.5);
    this._playSound("partyblower", 0.3);
    this.solvedEl.style.display = "block";
    // Spin the whole group as celebration
    gsap.to(this.rubikGroup.rotation, {
      y: this.rubikGroup.rotation.y + Math.PI * 4,
      duration: 2.5,
      ease: "back.out",
    });
    setTimeout(() => { this.solvedEl.style.display = "none"; }, 5000);
    if (typeof window._onCubeSolved === "function") window._onCubeSolved();
  }

  scramble() {
    if (this.isMoving || this.movementsStack.length || this.isSolving) return;
    this.hasBeenSolved = false;
    const prev = this.duration;
    this.duration = 0.15;
    [
      { layer: "col",   number: 1, orientation: 1 },
      { layer: "row",   number: 3, orientation: 0 },
      { layer: "depth", number: 3, orientation: 1 },
      { layer: "col",   number: 1, orientation: 0 },
      { layer: "row",   number: 1, orientation: 1 },
      { layer: "depth", number: 1, orientation: 0 },
      { layer: "col",   number: 3, orientation: 1 },
    ].forEach((m) => this.movementsStack.push(m));
    const restore = this._solveRestoreOnDone;
    this._solveRestoreOnDone = () => {
      this.duration = prev;
      this._solveRestoreOnDone = restore ?? null;
    };
    this._startNextMove();
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  _bindResize() {
    window.addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    });
  }

  // ─── Render Loop ──────────────────────────────────────────────────────────

  _tick = () => {
    requestAnimationFrame(this._tick);
    this.controls.update();

    if (this.isActive) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      this.objectRaycasted = hits.length ? hits[0] : null;
    }

    this.renderer.render(this.scene, this.camera);
  };
}

window.cubeApp = new RubiksCubeApp();
