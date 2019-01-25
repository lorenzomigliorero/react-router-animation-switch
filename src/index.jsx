import React, {
  createElement, cloneElement, Component, Fragment,
} from 'react';
import PropTypes from 'prop-types';
import { withRouter, matchPath } from 'react-router-dom';
import promiseCancel from 'promise-cancel';

@withRouter
class TransitionSwitch extends Component {
  static propTypes = {
    parallel: PropTypes.bool,
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
    ]).isRequired,
    match: PropTypes.object.isRequired, // eslint-disable-line
    location: PropTypes.shape({ pathname: PropTypes.string }).isRequired,
    dispatch: PropTypes.func,
  }

  static defaultProps = {
    parallel: false,
    dispatch: () => {},
  }

  static promisedCallback = Promise.resolve.bind(Promise)

  static getMatchedRoute(props) {
    const {
      children,
      location,
    } = props;

    return children.find(({ props: routeProps }) => {
      /* If path isn't declared, force match for 404 */
      const { path } = routeProps;
      return path
        ? !!matchPath(location.pathname, routeProps)
        : true;
    });
  }

  static getRouteWithRef(props, route, ref) {
    if (!route) return null;
    /*
      Call ref function once to avoid ref overwrite on TransitionSwitch rerender,
      after a setState
    */
    let index = 0;
    const refCallback = (a) => {
      if (index === 0) {
        index += 1;
        return ref.current = a; // eslint-disable-line
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

  cancellablePromises = []

  enterRef = React.createRef()

  leaveRef = React.createRef()

  parallelRef = React.createRef()

  state = (() => {
    const { location } = this.props;
    const route = TransitionSwitch.getMatchedRoute(this.props);
    const match = route.props.path
      ? matchPath(location.pathname, route.props)
      : null;
    return {
      match,
      isFetching: false,
      leaveRouteKey: null,
      location,
      prevLocation: null,
      enterRouteKey: route.key,
    };
  })();

  static getDerivedStateFromProps = (nextProps, state) => {
    const {
      match,
      enterRouteKey,
      leaveRouteKey,
    } = state;

    const nextMatchedRoute = TransitionSwitch.getMatchedRoute(nextProps);
    const nextMatch = nextMatchedRoute.props.path
      ? matchPath(nextProps.location.pathname, nextMatchedRoute.props)
      : null;
    const onlyParamsAreChanged = (
      JSON.stringify(match?.params) !== JSON.stringify(nextMatch?.params)
      && (nextMatchedRoute.key === enterRouteKey)
    );

    if (
      /*
        Detect if matchPath return a new key.
        EnterRoute can be null if change page before leavePromise is complete
      */
      nextMatchedRoute.key !== enterRouteKey
      || onlyParamsAreChanged
    ) {
      const { fetchData } = nextMatchedRoute.props.component;
      const raceMode = (leaveRouteKey !== null);

      return {
        raceMode,
        enterRouteKey: nextMatchedRoute.key,
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
  }

  componentDidMount() {
    const appearPromise = this.saveCancellablePromise(this.routeComponentWillAppear());
    appearPromise.promise.then(this.routeComponentDidAppear).catch(() => {});
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      enterRouteKey,
      leaveRouteKey,
      onlyParamsAreChanged,
      isFetching,
      raceMode,
    } = this.state;

    const { parallel } = this.props;

    const initTransition = (
      prevState.enterRouteKey !== enterRouteKey
      || (prevState.enterRouteKey === enterRouteKey && onlyParamsAreChanged && isFetching)
    );

    const fetchIsEnded = prevState.isFetching && !isFetching;

    if (initTransition) {
      this.resetCancellablePromises();
      this.fetchData();
    }

    if (fetchIsEnded) {
      if (parallel) {
        if (!raceMode) {
          this.freezeParallelRef();
          this.callLeaveLifeCycle();
        }
        this.callEnterLifeCycle();
      } else if (!raceMode) {
        this.callLeaveLifeCycle();
      } else {
        this.callEnterLifeCycle();
      }
    }

    if (prevState.leaveRouteKey && leaveRouteKey === null && !raceMode && !parallel) {
      this.callEnterLifeCycle();
    }
  }

  callLeaveLifeCycle = () => {
    const leavePromise = this.saveCancellablePromise(this.routeComponentWillLeave());
    return leavePromise.promise
      .then(this.routeComponentDidLeave)
      .then(() => this.setState({ leaveRouteKey: null }))
      .catch(() => {});
  }

  callEnterLifeCycle = () => {
    const enterPromise = this.saveCancellablePromise(this.routeComponentWillEnter());
    return enterPromise.promise
      .then(this.routeComponentDidEnter)
      .catch(() => {});
  }

  freezeParallelRef = () => {
    const bounds = this.parallelRef.current.getBoundingClientRect();
    this.parallelRef.current.style.position = 'fixed';
    this.parallelRef.current.style.top = `${bounds.top}px`;
    this.parallelRef.current.style.left = `${bounds.left}px`;
  }

  saveCancellablePromise = (promise) => {
    const cancellablePromise = promiseCancel(promise);
    this.cancellablePromises.push(cancellablePromise);
    return cancellablePromise;
  }

  resetCancellablePromises = () => {
    this.cancellablePromises.forEach(promise => promise.cancel());
    this.cancellablePromises = [];
  }

  fetchData = () => {
    const { dispatch } = this.props;

    const {
      match,
      fetchData,
    } = this.state;

    const fetchDataPromise = this.getRouteMethod({
      method: fetchData,
      name: 'fetchData',
      match,
      dispatch,
    });

    return this.saveCancellablePromise(fetchDataPromise()).promise
      .then(() => this.setState({ isFetching: false }))
      .catch(() => {});
  }

  getRouteMethod = ({
    name,
    ref,
    method,
    ...params
  }) => {
    const fn = method
      || (ref?.current && ref?.current[name])
      || this.constructor.promisedCallback;
    return fn.bind(this, params);
  }

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
      name: onlyParamsAreChanged
        ? 'sameComponentWillEnter'
        : 'componentWillEnter',
    })();
  };

  routeComponentDidEnter = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.enterRef,
      name: onlyParamsAreChanged
        ? 'sameComponentDidEnter'
        : 'componentDidEnter',
    })();
  };

  routeComponentWillLeave = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.leaveRef,
      name: onlyParamsAreChanged
        ? 'sameComponentWillLeave'
        : 'componentWillLeave',
    })();
  };

  routeComponentDidLeave = () => {
    const { onlyParamsAreChanged } = this.state;
    return this.getRouteMethod({
      ref: this.leaveRef,
      name: onlyParamsAreChanged
        ? 'sameComponentDidLeave'
        : 'componentDidLeave',
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

    const {
      children,
      parallel,
    } = this.props;

    const leaveRoute = raceMode ? null : TransitionSwitch.getRouteWithRef(
      { location: prevLocation },
      children.find(r => r.key === leaveRouteKey),
      this.leaveRef,
    );

    const enterRoute = isFetching ? null : TransitionSwitch.getRouteWithRef(
      { location },
      children.find(r => r.key === enterRouteKey),
      this.enterRef,
    );

    return !parallel
      ? (leaveRoute || enterRoute)
      : (
        <Fragment>
          {leaveRoute && parallel
            ? (
              <section ref={this.parallelRef}>
                {leaveRoute}
              </section>
            ) : leaveRoute
          }
          {enterRoute}
        </Fragment>
      );
  }
}

export default TransitionSwitch;
