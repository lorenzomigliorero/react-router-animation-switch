import AnimationSwitch from './index';
import { actions } from './state';

export const getMatchFromRoutes = (routes, url) => {
  let match;
  routes.find((route) => {
    match = AnimationSwitch.getNormalizedMatch(route, url);
    return match;
  });
  return match;
};

export const getActionWithMatch = (routes, url) => actions.onSSR(getMatchFromRoutes(routes, url));
