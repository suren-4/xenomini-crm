type Task = () => Promise<void>;

export class ConcurrencyQueue {
  private waiting: Task[] = [];
  private active = 0;

  constructor(private readonly concurrency: number) {}

  getStats() {
    return {
      waiting: this.waiting.length,
      active: this.active,
      concurrency: this.concurrency,
    };
  }

  /** Fire-and-forget enqueue — simulations run in background */
  enqueue(task: Task): void {
    this.waiting.push(task);
    this.pump();
  }

  private pump() {
    while (this.active < this.concurrency && this.waiting.length > 0) {
      const task = this.waiting.shift()!;
      this.active++;
      task()
        .catch((err) => console.error("[queue] task failed:", err))
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }
}
