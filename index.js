
module.exports = Chan;

function Chan(cap = Infinity) {
  const
    _sendQueue = [];

  let
    _waitList = [],
    _tickQueue = 0,
    _tickPhase = false;

  function _tick() {
    if (_tickPhase) {
      _tickQueue++;
      return;
    }
    _tickPhase = true;

    let list = _waitList;
    _waitList = [];

    list = list.filter((obj) => {
      if (obj.expr()) {
        obj.ok();
      } else {
        return true;
      }
    });

    _waitList = list.concat(_waitList);

    _tickPhase = false;
    if (_tickQueue > 0) {
      _tickQueue = 0;
      _tick();
    }
  }

  function _wait(expr, action) {
    if (expr()) {
      return Promise.resolve(action && action());
    }

    let ok;
    const promise = new Promise((resolve) => {
      ok = () => {
        resolve(action && action());
      }
    });

    _waitList.push({
      expr,
      ok
    });

    return promise
  }

  async function send(value) {
    let reply, error;
    const promise = new Promise((resolve, reject) => {
      reply = resolve;
      error = reject;
    });

    await _wait(
      () => _sendQueue.length < cap,
      () => {
        _sendQueue.push({
          value,
          reply,
          error
        });
      }
    );

    _tick();
    return promise;
  }

  function receiver(fn) {
    let
      cancelled = false;

    async function loop() {
      while(!cancelled) {
        let obj = await _wait(
          () => _sendQueue.length > 0,
          () => {
            if (!cancelled) {
              return _sendQueue.shift()
            }
          }
        );
        if (cancelled) break;

        _tick();

        try {
          const value = await fn(obj.value);
          obj.reply(value);
        } catch (e) {
          obj.error(e);
          break;
        }
      }
    }

    loop();

    return () => {
      cancelled = true;
    }
  }

  return {
    send,
    receiver,

    readonly: {
      receiver
    }
  }
}
