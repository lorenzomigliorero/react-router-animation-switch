import React, {
  createElement, cloneElement, Component,
} from 'react';
import PropTypes from 'prop-types';
import { withRouter, matchPath } from 'react-router-dom';
import promiseCancel from 'promise-cancel';
import { actions, reducer } from './state';
import * as utils from './utils';

class AnimationSwitch extends Component {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
    match: PropTypes.object.isRequired, // eslint-disable-line
    location: PropTypes.shape({ pathname: PropTypes.string }).isRequired,
    dispatch: PropTypes.func,
  };

  static defaultProps = {
    dispatch: () => {},
  };

  static promisedCallback = Promise.resolve.bind(Promise);

  static getMatchedRoute(props) {
    const { children, location } = props;

    return children.find(({ props: routeProps }) => {
      /* If path isn't declared, force match for 404 */
      const { path } = routeProps;
      return path ? !!matchPath(location.pathname, routeProps) : true;
    });
  }

  static getRouteWithRef(props, route, ref) {
    if (!route) return null;
    /*
      Call ref function once to avoid ref overwrite on AnimationSwitch rerender,
      after a setState
    */
    let index = 0;
    const refCallback = (a) => {
      if (index === 0) {
        index += 1;
        return (ref.current = a); // eslint-disable-line
      }
      return null;
    };

    return cloneElement(route, {
      ...props,
      component: null,
      render: propsFromRender => createElement(route.props.component, {
        ...propsFromRender,
        ref: refCallback,
      }),
    });
  }

  static getNormalizedMatch = (route, pathname) => {
    const match = route.path ? matchPath(pathname, route) : null;
    if (match) {
      Object.assign(match, route);
      delete match.component;
      delete match.fetchData;
    }
    return match;
  }

  cancellablePromises = [];

  enterRef = React.createRef();

  leaveRef = React.createRef();

  parallelRef = React.createRef();

  state = (() => {
    const { location } = this.props;
    const route = AnimationSwitch.getMatchedRoute(this.props);
    const match = AnimationSwitch.getNormalizedMatch(
      route.props,
      location.pathname,
    );
    const preload = route.props?.component?.preload;
    return {
      match,
      isFetching: false,
      leaveRouteKey: null,
      location,
      preload,
      prevLocation: null,
      onlyParamsAreChanged: false,
      enterRouteKey: route.key,
    };
  })();

  static getDerivedStateFromProps = (nextProps, state) => {
    const {
      location, match, enterRouteKey, leaveRouteKey,
    } = state;

    const nextMatchedRoute = AnimationSwitch.getMatchedRoute(nextProps);
    const nextMatch = AnimationSwitch.getNormalizedMatch(
      nextMatchedRoute.props,
      nextProps.location.pathname,
    );

    const onlyParamsAreChanged = (
      (JSON.stringify(match?.params) !== JSON.stringify(nextMatch?.params))
      || location.pathname !== nextProps.location.pathname
    ) && nextMatchedRoute.key === enterRouteKey;

    if (
      /*
        Detect if matchPath return a new key.
        EnterRoute can be null if change page before leavePromise is complete
      */
      nextMatchedRoute.key !== enterRouteKey
      || onlyParamsAreChanged
    ) {
      const { fetchData, component } = nextMatchedRoute.props;
      const { preload } = component;

      const raceMode = leaveRouteKey !== null;

      return {
        raceMode,
        enterRouteKey: nextMatchedRoute.key,
        preload,
        fetchData,
        isFetching: true,
        leaveRouteKey: !raceMode ? enterRouteKey : null,
        location: nextProps.location,
        match: nextMatch,
        onlyParamsAreChanged,
        prevLocation: state.location,
      };
    }

    return null;
  };

  componentDidMount() {
    this.callAppearLifeCycle();
  }

  async componentDidUpdate(prevProps, prevState) {
    const {
      enterRouteKey,
      preload,
      leaveRouteKey,
      onlyParamsAreChanged,
      isFetching,
      raceMode,
    } = this.state;

    const initTransition = prevState.enterRouteKey !== enterRouteKey
      || (prevState.enterRouteKey === enterRouteKey && onlyParamsAreChanged && isFetching);

    const fetchIsEnded = prevState.isFetching && !isFetching;

    if (preload) {
      await preload();
    }

    if (initTransition) {
      this.dispatch('onStart');
      this.resetCancellablePromises();
      this.fetchData();
    }

    if (fetchIsEnded) {
      if (!raceMode) {
        this.callLeaveLifeCycle();
      } else {
        this.callEnterLifeCycle();
      }
    }

    if (prevState.leaveRouteKey && leaveRouteKey === null && !raceMode) {
      this.callEnterLifeCycle();
    }
  }


  callLeaveLifeCycle = () => {
    this.dispatch('onStartLeave');
    const leavePromise = this.saveCancellablePromise(this.routeComponentWillLeave());
    return leavePromise.promise
      .then(this.routeComponentDidLeave)
      .then(() => this.dispatch('onFinishLeave'))
      .then(() => this.setState({ leaveRouteKey: null }))
      .catch(() => {});
  };

  callAppearLifeCycle = () => {
    const { match } = this.state;
    this.dispatch('onStartEnter', match);
    const appearPromise = this.saveCancellablePromise(this.routeComponentWillAppear());
    return appearPromise.promise
      .then(this.routeComponentDidAppear)
      .then(() => this.dispatch('onFinishEnter'))
      .catch(() => {});
  };

  callEnterLifeCycle = () => {
    const { match } = this.state;
    this.dispatch('onStartEnter', match);
    const enterPromise = this.saveCancellablePromise(this.routeComponentWillEnter());
    return enterPromise.promise
      .then(this.routeComponentDidEnter)
      .then(() => this.dispatch('onFinishEnter'))
      .catch(() => {});
  };

  dispatch = (action, props) => {
    const { dispatch } = this.props;
    const { onlyParamsAreChanged } = this.state;
    dispatch(actions[action]({
      same: onlyParamsAreChanged,
      ...props,
    }));
  };

  saveCancellablePromise = (promise) => {
    const cancellablePromise = promiseCancel(promise);
    this.cancellablePromises.push(cancellablePromise);
    return cancellablePromise;
  };

  resetCancellablePromises = () => {
    this.cancellablePromises.forEach(promise => promise.cancel());
    this.cancellablePromises = [];
  };

  fetchData = () => {
    const { dispatch } = this.props;

    const { match, fetchData } = this.state;

    const fetchDataPromise = this.getRouteMethod({
      method: fetchData,
      name: 'fetchData',
      match,
      dispatch,
    });

    return this.saveCancellablePromise(fetchDataPromise())
      .promise.then(() => this.setState({ isFetching: false }))
      .catch(() => {});
  };

  getRouteMethod = ({
    name, ref, method, ...params
  }) => {
    const fn = method || (ref?.current && ref?.current[name]) || this.constructor.promisedCallback;
    return fn.bind(this, params);
  };

  routeComponentWillAppear = () => this.getRouteMethod({
    ref: this.enterRef,
    name: 'componentWillAppear',
  })();

  routeComponentDidAppear = () => this.getRouteMethod({
    ref: this.enterRef,
    name: 'componentDidAppear',
  })();

  routeComponentWillEnter = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.enterRef,
      name: onlyParamsAreChanged ? 'sameComponentWillEnter' : 'componentWillEnter',
    })();
  };

  routeComponentDidEnter = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.enterRef,
      name: onlyParamsAreChanged ? 'sameComponentDidEnter' : 'componentDidEnter',
    })();
  };

  routeComponentWillLeave = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.leaveRef,
      name: onlyParamsAreChanged ? 'sameComponentWillLeave' : 'componentWillLeave',
    })();
  };

  routeComponentDidLeave = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.leaveRef,
      name: onlyParamsAreChanged ? 'sameComponentDidLeave' : 'componentDidLeave',
    })();
  };

  render() {
    const {
      enterRouteKey,
      leaveRouteKey,
      isFetching,
      prevLocation,
      raceMode,
      location,
    } = this.state;

    const { children } = this.props;

    const leaveRoute = raceMode
      ? null
      : AnimationSwitch.getRouteWithRef(
        { location: prevLocation },
        children.find(r => r.key === leaveRouteKey),
        this.leaveRef,
      );

    const enterRoute = isFetching
      ? null
      : AnimationSwitch.getRouteWithRef(
        { location },
        children.find(r => r.key === enterRouteKey),
        this.enterRef,
      );

    return leaveRoute || enterRoute;
  }
}

export { actions, reducer, utils };

export default withRouter(AnimationSwitch);
