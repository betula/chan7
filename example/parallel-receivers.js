#!/usr/bin/env node --harmony

const
  Chan = require('../')
;

function timeout(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  });
}


const chan = Chan();

for (let i = 0; i < 10; i++) {
  (function(i) {

    chan.receiver(async (v) => {
      console.log(`start task ${v} on ${i} worker`);
      await timeout(100 + v);
      console.log(`end task ${v} on ${i} worker`);
    });

  })(i);
}

for (let v = 0; v < 15; v++) {
  chan.send(v);
}