// eslint-disable-next-line object-curly-newline
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useRouteMatch, useLocation, matchPath } from 'react-router-dom';
import { useMachine } from '@xstate/react';
import machine from './machine';
import { actions as stateActions } from '../state';

const safePromise = method => (typeof method === 'function' ? method : Promise.resolve.bind(Promise));

const renderRoute = ({
  ref,
  route: Route,
  ...props
}) => React.cloneElement(Route, {
  ...Route.props,
  ...props,
  component: null,
  render: renderProps => React.createElement(Route.props.component, {
    ...renderProps,
    ref: typeof Route.props.component !== 'function' ? ref : null,
  }),
});

const AnimationSwitch = ({
  dispatch,
  children,
  parallel,
}) => {
  const getRouteByLocation = useCallback((location) => {
    const routes = React.Children.toArray(children);
    return routes.find(r => (r.props.path
      ? matchPath(location.pathname, r.props)
      : true));
  }, [children]);

  const location = useLocation();
  const [currentLocation, setCurrentLocation] = useState(location);
  const [nextLocation, setNextLocation] = useState();
  const routeByLocation = getRouteByLocation(location);
  const routeByCurrentLocation = getRouteByLocation(currentLocation);
  const routeByNextLocation = nextLocation
    ? getRouteByLocation(nextLocation)
    : null;
  const routesAreEquals = routeByLocation.key === routeByCurrentLocation.key;
  const match = useRouteMatch(routeByLocation.props.path);
  const currentRef = useRef();
  const nextRef = useRef();

  const services = {
    preload: () => safePromise(routeByLocation.props.component?.preload)(),
    fetch: () => safePromise(routeByLocation.props.fetchData)({ dispatch, match }),
    appear: () => safePromise(currentRef.current?.componentWillAppear)(),
    leave: () => safePromise(currentRef.current?.componentWillLeave)(),
    enterCurrent: () => safePromise(currentRef.current?.componentWillEnter)(routesAreEquals),
    enterNext: () => safePromise(nextRef.current?.componentWillEnter)(routesAreEquals),
  };

  const actions = {
    updateCurrent: () => setCurrentLocation(location),
    updateNext: () => setNextLocation(location),
    resetNext: () => setNextLocation(null),
    appeared: () => safePromise(currentRef.current?.componentDidAppear)(),
    leaved: () => safePromise(currentRef.current?.componentDidLeave)(),
    enteredCurrent: () => safePromise(currentRef.current?.componentDidEnter)(),
    enteredNext: () => safePromise(nextRef.current?.componentDidEnter)(),
  };

  const [current, send, service] = useMachine(
    machine.withContext({
      parallel,
      counter: 0,
      race: false,
    }),
    {
      services,
      actions,
    },
  );

  useEffect(() => {
    Object.assign(service.machine.options.services, services);
  }, [services]);

  useEffect(() => {
    Object.assign(service.machine.options.actions, actions);
  }, [actions]);

  useEffect(() => {
    if (current.value === 'preload') {
      dispatch(stateActions.transition({
        isActive: true,
        meta: routeByLocation.props.meta,
      }));
    } else if (current.value === 'idle') {
      dispatch(stateActions.transition({ isActive: false }));
    }
  }, [dispatch, current.value, routeByLocation.props.meta]);

  useEffect(() => {
    send('TRANSITION');
  }, [location.pathname]);

  const routes = useMemo(() => [
    renderRoute({
      route: routeByCurrentLocation,
      location: currentLocation,
      ref: currentRef,
      key: routeByNextLocation && routesAreEquals
        ? `${routeByCurrentLocation.key}-enter`
        : null,
    }),
    routeByNextLocation && renderRoute({
      route: routeByNextLocation,
      location: nextLocation,
      ref: nextRef,
    }),
  ], [
    currentLocation,
    nextLocation,
  ]);

  return React.createElement(React.Fragment, null, routes);
};

AnimationSwitch.propTypes = {
  dispatch: PropTypes.func,
  parallel: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

AnimationSwitch.defaultProps = {
  dispatch: () => {},
  parallel: false,
  children: null,
};

export default AnimationSwitch;
