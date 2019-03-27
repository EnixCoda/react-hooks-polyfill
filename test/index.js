require('../build/index')
const React = require('react')
const ReactDOM = require('react-dom')

function StateAndEffects() {
  let [count, setCount] = React.useState(0)
  React.useEffect(() => {
    console.log('This run only ONCE')
    // useState() // Un-comment this will raise an expected error.
    const id = setInterval(() => setCount(++count), 1000)
    return () => {
      console.log(`Clearing interval`)
      clearInterval(id)
    }
  }, [])
  React.useEffect(() => {
    console.log('This run every twice render')

    return () => {
      console.log(`Unsubscribing`)
    }
  }, [Math.round(count / 2)])
  React.useEffect(() => {
    console.log('This run at every render')
    document.title = count
  })
  return (
    <TestContext.Provider value={count}>
      <button onClick={() => setCount(0)}>reset</button>
      <ContextConsumer />
    </TestContext.Provider>
  )
}

const TestContext = React.createContext(0)
function ContextConsumer() {
  const value = React.useContext(TestContext)
  return value
}

function ToggleMount(props) {
  const [active, setActive] = React.useState(true)
  return (
    <div>
      <div>
        <button onClick={() => setActive(!active)}>{active ? 'unmount' : 'mount'}</button>
      </div>
      {active ? props.children : null}
    </div>
  )
}

const root = document.querySelector('#react-root')
if (root) {
  ReactDOM.render(
    <div>
      <p>React version: {React.version}</p>
      <ToggleMount>
        <StateAndEffects />
      </ToggleMount>
    </div>,
    root
  )
}
