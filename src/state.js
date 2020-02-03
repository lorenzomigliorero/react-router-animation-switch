const ACTION = 'ROUTER_TRANSITION';

const initialState = { isActive: false };

const reducer = (state = initialState, action) => {
  if (typeof action === 'undefined') return state;
  switch (action.type) {
    case ACTION: {
      return {
        ...state,
        ...action.payload,
      };
    }
    default:
      return state;
  }
};

const actions = { transition: payload => ({ type: ACTION, payload }) };

export {
  reducer,
  actions,
};
