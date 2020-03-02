# react-router-animation-switch

A component for manage animated route transitions with React, built with [React Router](https://reacttraining.com/react-router/web/) and [xstate](https://xstate.js.org/docs/).  

* [How it works](#howitworks)
* [Props table](#propstable)
* [How to use](#installation)
* [Reducer structure](#reducerstructure)

## <a name="howitworks"></a>How it works

Basically, this component is responsible to invoke lifecycles from the passed component.  
On first landing, this are the invoked lifecycles:  

1. **componentWillAppear** (*async*)
2. **componentDidAppear** (*sync*)

On all the next transition:  

1. **preload** (*async, optional*)  
  If component is a dynamic component (see [@loadable/component](https://loadable-components.com/)), preload method will be invoked
2. **fetchData** (*async, optional*)  
If exposed, component.fetchData will be invoked (useful in SSR environments for fetch external data)
3. **componentWillLeave** (*async*)
4. **componentDidLeave** (*sync*)
5. **componentWillEnter** (*async*)
6. **componentDidEnter** (*sync*)

See [here](https://xstate.js.org/viz/?gist=e24ae4a552bab90cc9ba85413e5392ea) the related xstate machine.

## <a name="propstable"></a>Props table

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| parallel | <code>Boolean</code> | false | If set to true, `leave` and `enter` are called simultaneally  |
| dispatch | <code>Function</code> | () => {} | Store dispatch function, used internally for manage reducer and `fetchData` method |

## <a name="installation"></a>Installation

1st: replace `Switch` with `AnimatedSwitch`

```javascript
import AnimatedSwitch from 'react-router-animation-switch';
import { useDispatch } from 'react-redux';
import { Route } from 'react-router-dom';

export default () => {
  const dispatch = useDispatch();

  return (
    <AnimatedSwitch dispatch={dispatch}>
      <Route path="foo" component={Foo} />
      <Route path="bar" component={Bar} />
    </AnimatedSwitch>
  );
};
```

2st: expose lifecycles from each Route component

```javascript
import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import anime from 'animejs';

const Foo = forwardRef((props, ref) => {
  const $wrapperRef = useRef();

  const enterAnimation = () => anime({
    targets: $wrapperRef.current,
    opacity: [0, 1],
    easing: 'linear',
  }).finished;

  const leaveAnimation = () => anime({
    targets: $wrapperRef.current,
    opacity: 0,
    easing: 'linear',
  }).finished;

  useImperativeHandle(ref => ({
    componentWillAppear: enterAnimation,
    componentWillEnter: enterAnimation,
    componentWillLeave: leaveAnimation,
    componentDidAppear: () => console.log('Appeared'),
    componentDidEnter: () => console.log('Entered'),
    componentDidLeave: () => console.log('Leaved'),
  }));

  return () => <div ref={$wrapperRef}>Foo example component</div>;
});

Foo.fetchData = async ({ dispatch, match }) => {
  // fetch data from external resource
};

export default Foo;
```

3th: connect reducer (optional)

```javascript
import { reducer } from 'react-router-animation-switch';

export default combineReducers({
  ...,
  pageTransition: reducer,
});
```

## <a name="reducerstructure"></a>Reducer structure

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| pageTransition.isActive | <code>Boolean</code> | false | If true, a page transition is in progress

```javascript
/*
* Example usage
* Reset scrollTop when transition is finished
*/
useEffect(() => {
  if (!isActive) {
    document.documentElement.scrollTop = 0;
  }
}, [isActive])
```