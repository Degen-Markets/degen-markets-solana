import { DegenPoolsEvents, program } from "./constants";

/**
 *
 * This class abstracts away the logic of managing event listener handlers for you.
 * The benefit is it avoids the need to manually remove listeners. If you don't remove
 * listeners, they will prevent the test process from exiting.
 *
 * Another benefit is you don't need
 * @usage
 * ```ts
 * let listenerService: EventListenerService;
 *
 * beforeAll(() => {
 *   listenerService = new EventListenerService();
 * });
 *
 * it("should have correct event", async () => {
 *   listener = listenerService.listen("myEventName");
 *   await triggerMyEvent();
 *   const event = await listener;
 *   expect(event.value).toEqual(expectedValue);
 * });
 *
 * afterAll(() => {
 *   await listenerService.reset();
 * });
 * ```
 */
export class EventListenerService {
  private activeListeners: number[] = [];

  listen<T extends keyof DegenPoolsEvents>(eventName: T) {
    return new Promise<DegenPoolsEvents[T]>((res) => {
      const listener = program.addEventListener(
        eventName,
        async (e: DegenPoolsEvents[T]) => {
          res(e);
        },
      );
      this.activeListeners.push(listener);
    });
  }

  async reset() {
    await Promise.all(
      this.activeListeners.map(async (listener) => {
        await program.removeEventListener(listener);
      }),
    );
  }
}
