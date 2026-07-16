import { Engine, Scene, Vector3, HavokPlugin } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { createWorld } from "bitecs";

/**
 * GameEngine is the core wrapper around Babylon.js Engine and Scene.
 * It initializes the WebGL context and Havok physics plugin.
 */
export class GameEngine {
    public engine: Engine;
    public scene: Scene;
    public world: any;
    public canvas: HTMLCanvasElement;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.world = createWorld();
        
        // Optimize scene for games
        this.scene.skipPointerMovePicking = true;
        this.scene.autoClear = false; // Color buffer
        this.scene.autoClearDepthAndStencil = false; // Depth and stencil
    }

    public async initialize() {
        // Initialize Havok Physics
        const havokInstance = await HavokPhysics();
        const hk = new HavokPlugin(true, havokInstance);
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

        // Handle window resize
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // Start render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }
}
