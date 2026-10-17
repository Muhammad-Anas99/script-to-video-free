// Runs video jobs one after another (or a few at a time) so small servers do not run out of memory.

function createQueue({ max = 1, run, onPosition }) {
  const waiting = [];
  let running = 0;

  const notify = () => waiting.forEach((id, i) => { if (onPosition) onPosition(id, running + i); });

  function pump() {
    while (running < max && waiting.length) {
      const id = waiting.shift();
      running += 1;
      Promise.resolve()
        .then(() => run(id))
        .catch((e) => console.error(e))
        .finally(() => { running -= 1; notify(); pump(); });
    }
  }

  return {
    add(id) { waiting.push(id); pump(); notify(); },
    size: () => ({ running, waiting: waiting.length }),
  };
}

module.exports = { createQueue };
