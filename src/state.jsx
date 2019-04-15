const initialState = {
  enter: false,
  leave: false,
  same: false,
  isActive: true,
};

const PAGE_TRANSITION_START_ENTER = 'PAGE_TRANSITION_START_ENTER';
const PAGE_TRANSITION_FINISH_ENTER = 'PAGE_TRANSITION_FINISH_ENTER';
const PAGE_TRANSITION_FINISH_LEAVE = 'PAGE_TRANSITION_FINISH_LEAVE';
const PAGE_TRANSITION_START_LEAVE = 'PAGE_TRANSITION_START_LEAVE';
const PAGE_TRANSITION_START = 'PAGE_TRANSITION_START';

export const actions = {
  onStart: same => ({
    type: PAGE_TRANSITION_START,
    payload: {
      isActive: true,
      same,
    },
  }),
  onStartEnter: same => ({
    type: PAGE_TRANSITION_START_ENTER,
    payload: {
      enter: true,
      same,
    },
  }),
  onFinishEnter: () => ({
    type: PAGE_TRANSITION_FINISH_ENTER,
    payload: {
      enter: false,
      isActive: false,
      same: false,
    },
  }),
  onStartLeave: same => ({
    type: PAGE_TRANSITION_START_LEAVE,
    payload: {
      leave: true,
      same,
    },
  }),
  onFinishLeave: same => ({
    type: PAGE_TRANSITION_FINISH_LEAVE,
    payload: {
      leave: false,
      same,
    },
  }),
};

export const reducer = (state = initialState, action) => {
  if (typeof action === 'undefined') return state;
  switch (action.type) {
    case PAGE_TRANSITION_START:
    case PAGE_TRANSITION_START_ENTER:
    case PAGE_TRANSITION_FINISH_ENTER:
    case PAGE_TRANSITION_FINISH_LEAVE:
    case PAGE_TRANSITION_START_LEAVE: {
      const newState = {
        ...state,
        ...action.payload,
      };
      // newState.isActive = newState.enter || newState.leave;
      return newState;
    }
    default:
      return state;
  }
};
