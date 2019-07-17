import * as React from 'react'
import { render } from 'react-dom'
import { Route, Switch, BrowserRouter } from 'react-router-dom'
import * as api from './api'
import { Room } from './Room'
import Exception from './Exception'

class App extends React.Component {
  state = {
    page: "home",
    userId: null,
    roomKey: null
  }

  onClickMakeRoom = async () => {
    this.setState({ page: "making-room" })

    const response1 = await api.postRequest("make-room", {})
    if (!response1['success']) {
      this.onError()
      return
    }
    const roomKey = response1['payload']['roomKey']

    const response2 = await api.postRequest("join-room", { roomKey: roomKey, name: "ASDF" })
    if (!response2['success']) {
      this.onError()
      return
    }
    const userId = response2['payload']['userId']

    this.setState({ page: "room", userId: userId, roomKey: roomKey })
  }

  onRoomQuit = () => {
    this.setState({ page: "home", userId: null, roomKey: null })
  }

  onError = () => {
    this.setState({ page: "exception" })
  }

  render = () => {
    if (this.state.page === "home") {
      return (
        <div>
          <button onClick={this.onClickMakeRoom}>방 만들기</button>
        </div>
      )
    }
    else if (this.state.page === "making-room") {
      return (
        <div>
          방 만드는 중
        </div>
      )
    }
    else if (this.state.page === "room") {
      return (
        <Room
          userId={this.state.userId}
          roomKey={this.state.roomKey}
          onQuit={this.onRoomQuit}
          onError={this.onError}
        />
      )
    }
    else if (this.state.page === "exception") {
      return (
        <Exception/>
      )
    }
  }
}

render(<App/>, document.getElementById('main'));