# react-hooks-polyfill

Polyfill for react hooks, no HoC needed!

> This is a experimental project, please do NOT use in production!

## Usage

At the very beginning of your app, add this snippet:

```js
import 'react-hooks-polyfill'
```

Then you get access to the hooks API.

```jsx
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
