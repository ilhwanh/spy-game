import * as React from 'react'
import { render } from 'react-dom'
import { Route, Switch, BrowserRouter } from 'react-router-dom';

class App extends React.Component {
  render = () => {
    return (
      <div>
        "hello"
      </div>
    )
  }
}

render(<App/>, document.getElementById('main'));