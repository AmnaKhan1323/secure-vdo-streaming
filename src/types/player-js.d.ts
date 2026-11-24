declare module "player.js" {
  export class Player {
    constructor(iframe: HTMLIFrameElement | string);
    receive(event: MessageEvent): boolean;
    on(event: string, callback: (data?: unknown) => void): void;
    off(event: string, callback?: (data?: unknown) => void): void;
    setCurrentTime(seconds: number): void;
    play(): void;
    pause(): void;
  }
  const playerjs: {
    Player: typeof Player;
    addEvent(element: EventTarget, type: string, handler: EventListener): void;
  };
  export default playerjs;
}