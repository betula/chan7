
module.exports = Chan;

function Chan(cap) {
  let
    wait,
    ready,
    error,
    queue = [];

  function reset() {
    queue = [];
    wait = new Promise((resolve, reject) => {
      ready = resolve;
      error = reject;
    });
  }

  function send(value) {
    const len = queue.length;
    if (len === cap) {
      throw 'Capacity is full'
    } if (len > 0) {
      queue.unshift(value);
    } else {
      queue.unshift(value);
      ready();
    }
  }

  function get() {
    const len = queue.length;
    if (len == 0) {
      return undefined

    } else if (len > 1) {
      return queue.pop();

    } else {
      const value = queue.pop();
      reset();
      return value;
    }
  }

  async function watch(fn) {
    for(;;) {
      await wait;
      await fn(get());
    }
  }

  function trans(fn) {
    const chan = Chan();

    (async () => {
      for(;;) {
        try {
          await wait;
          chan.send(await fn(get()));
        } catch (err) {
          chan.throw(err);
        }
      }
    })();

    return chan.readonly;
  }

  function _throw(err) {
    error(err);
  }

  function make(readonly) {
    const chan = {
      get,
      watch,
      trans,
      throw: _throw,

      get wait() {
        return wait;
      },
      get cap() {
        return cap;
      }
    };

    if (!readonly) {
      Object.assign(chan, {
        send,
        reset,

        readonly: make(true)
      });
    }

    return chan;
  }

  reset();
  return make();

}

Chan.join = (...chans) => {
  const chan = Chan();

  chans.forEach(async (ch) => {
    for(;;) {
      try {
        await ch.wait;
        chan.send(ch.get());
      } catch (err) {
        chan.throw(err);
      }
    }
  });

  return chan;

};

Chan.select = async (...chans) => {
  const promises = chans.map(
    (ch) => ch.wait.then(() => ch)
  );

  return await Promise.race(promises);
};
