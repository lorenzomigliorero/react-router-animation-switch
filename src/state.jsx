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
const PAGE_TRANSITION_SSR = 'PAGE_TRANSITION_SSR';

export const actions = {
  onSSR: props => ({
    type: PAGE_TRANSITION_SSR,
    payload: props,
  }),
  onStart: ({
    same,
    ...props
  }) => ({
    type: PAGE_TRANSITION_START,
    payload: {
      isActive: true,
      ...props,
      same,
    },
  }),
  onStartEnter: ({
    same,
    ...props
  }) => ({
    type: PAGE_TRANSITION_START_ENTER,
    payload: {
      enter: true,
      ...props,
      same,
    },
  }),
  onFinishEnter: (props = {}) => ({
    type: PAGE_TRANSITION_FINISH_ENTER,
    payload: {
      enter: false,
      isActive: false,
      same: false,
      ...props,
    },
  }),
  onStartLeave: ({
    same,
    ...props
  }) => ({
    type: PAGE_TRANSITION_START_LEAVE,
    payload: {
      leave: true,
      ...props,
      same,
    },
  }),
  onFinishLeave: ({
    same,
    ...props
  }) => ({
    type: PAGE_TRANSITION_FINISH_LEAVE,
    payload: {
      leave: false,
      ...props,
      same,
    },
  }),
};

export const reducer = (state = initialState, action) => {
  if (typeof action === 'undefined') return state;
  switch (action.type) {
    case PAGE_TRANSITION_SSR:
    case PAGE_TRANSITION_START:
    case PAGE_TRANSITION_START_ENTER:
    case PAGE_TRANSITION_FINISH_ENTER:
    case PAGE_TRANSITION_FINISH_LEAVE:
    case PAGE_TRANSITION_START_LEAVE: {
      return {
        ...state,
        ...action.payload,
      };
    }
    default:
      return state;
  }
};
