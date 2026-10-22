export interface AdapterFullscreen {
  readonly canFullscreen: boolean;
  enter(): Promise<void>;
  exit(): Promise<void>;
  readonly isFullscreen: boolean;
  mount(target: HTMLElement): void;
  unmount(): Promise<void>;
}

const owners = new WeakMap<HTMLElement, ContainerFullscreen>();

/** Fullscreen belongs to the host presentation container, including its chrome. */
export function createAdapterFullscreen(
  emit: (type: "fullscreenchange") => void
): AdapterFullscreen {
  return new ContainerFullscreen(emit);
}

class ContainerFullscreen implements AdapterFullscreen {
  private announcedState = false;
  private readonly emit: (type: "fullscreenchange") => void;
  private target: HTMLElement | null = null;

  constructor(emit: (type: "fullscreenchange") => void) {
    this.emit = emit;
  }

  get canFullscreen(): boolean {
    return Boolean(
      this.target?.requestFullscreen &&
        owners.get(this.target) === this &&
        this.target.ownerDocument.fullscreenEnabled !== false
    );
  }

  get isFullscreen(): boolean {
    return Boolean(
      this.target &&
        owners.get(this.target) === this &&
        this.target.ownerDocument.fullscreenElement === this.target
    );
  }

  mount(target: HTMLElement): void {
    if (target === this.target && owners.get(target) === this) {
      return;
    }
    const previous = this.target;
    previous?.ownerDocument.removeEventListener(
      "fullscreenchange",
      this.handleChange
    );
    if (previous && owners.get(previous) === this) {
      owners.delete(previous);
    }
    this.target = target;
    owners.set(target, this);
    this.announcedState = this.isFullscreen;
    target.ownerDocument.addEventListener(
      "fullscreenchange",
      this.handleChange
    );
    if (previous !== target) {
      this.releaseTarget(previous).catch(() => undefined);
    }
  }

  async enter(): Promise<void> {
    const { target } = this;
    if (target && !this.isFullscreen && this.canFullscreen) {
      await target.requestFullscreen();
      if (target !== this.target || owners.get(target) !== this) {
        await this.releaseTarget(target).catch(() => undefined);
        return;
      }
      this.handleChange();
    }
  }

  async exit(): Promise<void> {
    if (this.isFullscreen) {
      await this.releaseTarget(this.target);
      this.handleChange();
    }
  }

  async unmount(): Promise<void> {
    const { target } = this;
    target?.ownerDocument.removeEventListener(
      "fullscreenchange",
      this.handleChange
    );
    if (target && owners.get(target) === this) {
      owners.delete(target);
    }
    this.target = null;
    this.announcedState = false;
    await this.releaseTarget(target).catch(() => undefined);
  }

  private async releaseTarget(target: HTMLElement | null): Promise<void> {
    const owner = target && owners.get(target);
    if (
      target &&
      (!owner || owner === this) &&
      target.ownerDocument.fullscreenElement === target
    ) {
      await target.ownerDocument.exitFullscreen?.();
    }
  }

  private readonly handleChange = (): void => {
    if (this.target && this.isFullscreen !== this.announcedState) {
      this.announcedState = this.isFullscreen;
      this.emit("fullscreenchange");
    }
  };
}
