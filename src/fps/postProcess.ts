import * as THREE from 'three';

export interface CameraPostFrameParams {
  speed?: number;
  maxSpeed?: number;
  trauma?: number;
  adsBlend?: number;
  wallRunBlend?: number;
}

/**
 * Lightweight 60fps Chromebook-safe post-frame renderer wrapper.
 * Renders directly to the main WebGL framebuffer to eliminate intermediate
 * render-target stall overhead on integrated GPUs.
 */
export class CinematicPostProcessor {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  public setSize(width: number, height: number, pixelRatio = 1): void {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  public render(_params?: CameraPostFrameParams): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    // No offscreen targets to release
  }
}
