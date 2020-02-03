import { Machine, assign } from 'xstate';

const machine = Machine({
  id: 'transition',
  initial: 'idle',
  context: {
    parallel: true,
    counter: 0,
    race: false,
  },
  states: {
    idle: {
      entry: 'notRace',
      on: {
        TRANSITION: [
          {
            target: 'appear',
            cond: 'isFirstRequest',
          },
          {
            target: 'preload',
            cond: 'isNotFirstRequest',
          },
        ],
      },
    },
    appear: {
      exit: 'incrementCounter',
      invoke: {
        src: 'appear',
        onDone: {
          target: 'idle',
          actions: 'appeared',
        },
      },
    },
    preload: {
      invoke: {
        src: 'preload',
        onDone: 'fetch',
      },
    },
    fetch: {
      invoke: {
        src: 'fetch',
        onDone: [
          {
            target: 'enter',
            cond: 'isRace',
            actions: [
              'resetNext',
              'updateCurrent',
            ],
          },
          {
            target: 'parallel',
            cond: 'isParallel',
            actions: 'updateNext',
          },
          {
            target: 'leave',
            cond: 'isNotParallel',
          },
        ],
      },
    },
    parallel: {
      type: 'parallel',
      states: {
        leave: {
          initial: 'leaving',
          states: {
            leaving: {
              invoke: {
                src: 'leave',
                onDone: 'leaved',
              },
            },
            leaved: {
              entry: 'leaved',
              type: 'final',
            },
          },
        },
        enter: {
          initial: 'entering',
          states: {
            entering: {
              invoke: {
                src: 'enterNext',
                onDone: 'entered',
              },
            },
            entered: {
              entry: 'enteredNext',
              type: 'final',
            },
          },
        },
      },
      onDone: {
        actions: [
          'resetNext',
          'updateCurrent',
        ],
        target: 'idle',
      },
    },
    leave: {
      exit: 'updateCurrent',
      invoke: {
        src: 'leave',
        onDone: {
          actions: 'leaved',
          target: 'enter',
        },
      },
    },
    enter: {
      invoke: {
        src: 'enterCurrent',
        onDone: {
          actions: 'enteredCurrent',
          target: 'idle',
        },
      },
    },
  },
  on: {
    TRANSITION: [
      {
        target: 'preload',
        actions: [
          'race',
          'incrementCounter',
        ],
      },
    ],
  },
}, {
  guards: {
    isRace: context => context.race,
    isParallel: context => context.parallel,
    isNotParallel: context => !context.parallel,
    isFirstRequest: context => context.counter === 0,
    isNotFirstRequest: context => context.counter > 0,
  },
  actions: {
    incrementCounter: assign({ counter: context => context.counter + 1 }),
    race: assign({ race: true }),
    notRace: assign({ race: false }),
  },
});

export default machine;
