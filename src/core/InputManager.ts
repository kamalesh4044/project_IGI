export class InputManager {
    public keys: { [key: string]: boolean } = {};
    public isPointerLocked: boolean = false;
    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupKeyboard();
        this.setupPointerLock();
    }

    private setupKeyboard() {
        window.addEventListener("keydown", (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener("keyup", (e) => {
            this.keys[e.code] = false;
        });
    }

    private setupPointerLock() {
        this.canvas.addEventListener("click", () => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener("pointerlockchange", () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });
    }

    public isKeyDown(code: string): boolean {
        return this.keys[code] || false;
    }
}
