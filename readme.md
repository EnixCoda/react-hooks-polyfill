# react-hooks-polyfill

Polyfill for react hooks, no HoC needed!

## Usage

At the very beginning of your app, add this snippet:

```js
import 'react-hooks-polyfill' // This is all you need
import React from 'react'

function Counter() {
  const [count, setCount] = React.useState(0)
  return (
    <span>{count}</span>
    <button onClick={() => setCount(count + 1)}>+1</button>
  )
}
```

## Implemented hooks

- `useState`
- `useEffect`
- `useContext` (need React v16.3 or above)
